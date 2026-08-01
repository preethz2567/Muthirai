import sqlite3
import uuid
from datetime import datetime, timezone
import os
import sys
import numpy as np

# Ensure the app module can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.scoring.embedder import embed_texts, EMBEDDING_DIM
from app.scoring.vector_store import add_vectors

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../services/api/muthirai.db'))

CORPUS = {
    "saas": [
        "Elevate your workflow with our cutting-edge solutions.",
        "A seamless experience designed to leverage synergies.",
        "Best-in-class platform for modern teams.",
        "Unlock your potential with our innovative technology.",
        "Streamline your business processes from end to end."
    ],
    "fashion": [
        "Discover the latest trends for the modern wardrobe.",
        "Elevate your everyday style with our essential collection.",
        "Crafted for comfort without compromising on style.",
        "The perfect blend of classic elegance and modern edge.",
        "Step out in confidence with our premium apparel."
    ],
    "fmcg": [
        "Taste the difference in every single bite.",
        "Made with 100% natural ingredients you can trust.",
        "The perfect snack for your busy on-the-go lifestyle.",
        "Refreshingly delicious and packed with flavor.",
        "A wholesome choice for the entire family."
    ],
    "general": [
        "Experience the difference of truly disruptive innovation.",
        "We put our customers at the heart of everything we do.",
        "Committed to excellence in every single detail.",
        "Transforming the way you live, work, and play.",
        "Empowering you to achieve more every day."
    ]
}

def seed():
    print(f"Connecting to DB at {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Clear existing generic items
    cursor.execute("DELETE FROM generic_corpus_items")
    cursor.execute("DELETE FROM embeddings WHERE owner_type='generic_centroid'")

    for category, phrases in CORPUS.items():
        print(f"Processing category: {category}")
        embeddings = []
        for phrase in phrases:
            item_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc).isoformat()
            
            # The schema defines generic_corpus_items as:
            # id (UUID), category (TEXT), source (TEXT), content_text (TEXT), created_at (TIMESTAMP)
            cursor.execute(
                "INSERT INTO generic_corpus_items (id, category, source, content_text, created_at) VALUES (?, ?, ?, ?, ?)",
                (item_id, category, "seed_script", phrase, now)
            )
            vec = embed_texts([phrase])
            embeddings.append(vec)
        
        # Compute centroid
        stacked = np.vstack(embeddings)
        centroid = np.mean(stacked, axis=0, keepdims=True)
        # L2 normalize
        norm = np.linalg.norm(centroid)
        if norm > 0:
            centroid = centroid / norm

        # Save to FAISS
        owner = f"generic_centroid:{category}"
        add_vectors(owner, centroid)

        # Save metadata to DB
        embed_id = str(uuid.uuid4())
        # The schema defines embeddings as:
        # id, owner_type, owner_id, vector_ref, model_name, dimension, created_at
        cursor.execute(
            "INSERT INTO embeddings (id, owner_type, owner_id, vector_ref, model_name, dimension, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (embed_id, 'generic_centroid', category, owner, 'all-MiniLM-L6-v2', EMBEDDING_DIM, now)
        )

    conn.commit()
    conn.close()
    print("Seed complete! Generic centroids saved to FAISS and sqlite.")

if __name__ == "__main__":
    seed()
