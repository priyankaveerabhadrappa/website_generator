"""Domain-restricted page fetcher for the company research agent."""

from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup
from langchain_core.tools import StructuredTool

MAX_PAGE_CHARS = 6000
MAX_LINKS = 30


def registrable_domain(url: str) -> str | None:
    if not url:
        return None
    if "://" not in url:
        url = "https://" + url
    host = (urlparse(url).hostname or "").lower()
    if not host or "." not in host:
        return None
    return host.removeprefix("www.")


def _allowed(url: str, domains: set[str]) -> bool:
    host = (urlparse(url).hostname or "").lower()
    return any(host == d or host.endswith("." + d) for d in domains)


def make_fetch_tool(domains: set[str], fetched: list[str]) -> StructuredTool:
    async def fetch_page(url: str) -> str:
        """Fetch a page from the company's own website and return its visible text."""
        if "://" not in url:
            url = "https://" + url
        if urlparse(url).scheme not in ("http", "https") or not _allowed(url, domains):
            raise ValueError(f"URL not allowed. Only these domains may be fetched: {', '.join(sorted(domains))}")
        async with httpx.AsyncClient(
            follow_redirects=True, timeout=10.0, headers={"User-Agent": "appgen-research/1.0"}
        ) as client:
            response = await client.get(url)
        if not _allowed(str(response.url), domains):
            raise ValueError("Redirected outside the allowed domain")
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        links: list[str] = []
        for a in soup.find_all("a", href=True):
            link = urljoin(str(response.url), a["href"]).split("#")[0]
            if _allowed(link, domains) and link not in links:
                links.append(link)
        for tag in soup(["script", "style", "noscript", "svg", "nav", "footer"]):
            tag.decompose()
        text = " ".join(soup.get_text(" ").split())
        fetched.append(str(response.url))
        return f"URL: {response.url}\n{text[:MAX_PAGE_CHARS]}\n\nLinks on this page:\n" + "\n".join(links[:MAX_LINKS])

    return StructuredTool.from_function(coroutine=fetch_page, name="fetch_page")
