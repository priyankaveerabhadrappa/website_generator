# Lena Fischer

Leipzig, Germany | lena.fischer@example.com | linkedin.com/in/lena-fischer-example

---

## Profile
AI Engineer with 2+ years of experience building LLM, NLP and computer vision systems in research and industry. Built the retrieval pipeline behind a university help-desk chatbot serving 9,000+ students and staff, and an image classifier for automated parcel sorting trained on ~40,000 images. M.Sc. Computer Science student at Universität Leipzig, looking for an AI / Machine Learning Engineer role working on production LLM or computer vision systems.

---

## Work Experience

### Machine Learning Engineer | Nordfeld Logistics | Leipzig, Germany | 03/2026 -- Present
- Own the training data and model workflow for a CNN image classifier that sorts parcels by damage type on a conveyor-belt camera system.
- Built a dataset of ~40,000 labelled images from three camera stations, with annotation in CVAT and a shared 224x224 preprocessing step.
- Wrote Python and OpenCV quality checks for blurred, cropped and duplicate images, which surfaced a class imbalance before the first training run.
- Trained and compared TensorFlow/Keras architectures including EfficientNetB0 and ResNet50, and reported per-class error rates to the operations team.

### AI Engineer | Universität Leipzig, IT Services | Leipzig, Germany | 06/2025 -- 02/2026
- Built the document ingestion layer for a RAG help-desk chatbot on open-source LLMs, now serving 9,000+ students and staff.
- Converted ~3,000 anonymised support tickets into structured knowledge articles with an LLM pipeline, using a fixed output format so every article could be indexed consistently.
- Automated re-indexing of new tickets and updated documents, so the knowledge base stayed current without manual work.
- Deployed and maintained the model stack on university virtual machines with Docker Compose and Hugging Face.

### Full Stack Developer | Brightwave Analytics | Leipzig, Germany | 09/2024 -- 05/2025
- Built a React and TypeScript dashboard for survey results with filtering, charts and CSV export, used by 6 client teams.
- Developed FastAPI endpoints backed by PostgreSQL, secured with JWT authentication and role-based access.
- Added an embedding-based semantic search over open-text survey answers, so analysts could find related responses without exact keywords.

---

## Projects & Research

### Evaluating Open-Source LLMs for Student Support | Universität Leipzig | 10/2025 -- 08/2026
- Compared three open-weight LLMs across four retrieval setups on 5,000 course-related questions in English and German.
- Built an evaluation harness combining LLM-as-a-judge scoring, NLI-based faithfulness and ROUGE, to separate fluent answers from grounded ones.
- Found that full-document context beat chunked retrieval on judge-rated answer quality, which informed the chatbot's retrieval design.

### Text Classification for Customer Feedback | 01/2025 -- 04/2025
- Improved F1-score from 68% to 81% over a TF-IDF baseline on real customer feedback data with Scikit-learn and Pandas.

---

## Education

### M.Sc. Computer Science | Universität Leipzig | Leipzig, Germany | 10/2024 -- 09/2026
- Thesis: Evaluating Open-Source LLMs for Student Support: Answer Quality and Retrieval Strategies

### B.Sc. Computer Science | TU Dresden | Dresden, Germany | 10/2020 -- 09/2024
- Thesis: Data Augmentation for Small Image Classification Datasets

---

## Language Skills
- German (Native)
- English (C1)

---

## Technical Skills
- LLMs & RAG: Retrieval-Augmented Generation (RAG), LLM Evaluation (LLM-as-a-Judge), Prompt Engineering, Semantic Search, Embeddings, Hugging Face, Open-Source LLMs
- Machine Learning & Vision: TensorFlow / Keras, CNNs, Image Classification, OpenCV, Scikit-learn
- Programming & Data: Python, SQL, Pandas, NumPy, PostgreSQL
- Backend & Deployment: FastAPI, REST APIs, Docker & Docker Compose, Linux, Git
- Frontend: React, TypeScript
