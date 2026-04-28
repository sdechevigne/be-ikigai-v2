#!/usr/bin/env python3
"""
Vérifie si un sujet est trop proche d'articles existants.
Usage : python3 pipeline/check-duplicate.py "mon idée d'article" src/content/blog/
Sortie : liste JSON des articles similaires avec score (0-100).
Code de sortie : 0 = OK, 1 = similarités trouvées au-dessus du seuil.
"""
import sys
import re
import json
from pathlib import Path

THRESHOLD = 40  # score >= THRESHOLD → warning
STOPWORDS = {
    'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'en', 'au', 'aux',
    'par', 'pour', 'sur', 'dans', 'avec', 'est', 'sont', 'que', 'qui', 'ou',
    'the', 'a', 'an', 'of', 'to', 'in', 'for', 'on', 'with', 'and', 'or', 'is',
    'how', 'why', 'what', 'your', 'you', 'at', 'it', 'its', 'from', 'by',
    'comment', 'pourquoi', 'quand', 'quoi', 'votre', 'notre', 'mon', 'ma',
    'ce', 'cet', 'cette', 'ces', 'se', 'sa', 'son', 'ses',
}

def tokenize(text: str) -> set:
    text = text.lower()
    for a, b in [('é','e'),('è','e'),('ê','e'),('ë','e'),('à','a'),('â','a'),
                 ('ù','u'),('û','u'),('ô','o'),('î','i'),('ï','i'),('ç','c')]:
        text = text.replace(a, b)
    tokens = set(re.findall(r'\b[a-z]{3,}\b', text))
    return tokens - STOPWORDS

def extract_frontmatter_field(content: str, field: str) -> str:
    m = re.search(rf'^{field}:\s*["\']?(.+?)["\']?\s*$', content, re.MULTILINE)
    return m.group(1).strip() if m else ''

def score_similarity(tokens_a: set, tokens_b: set) -> int:
    if not tokens_a or not tokens_b:
        return 0
    intersection = tokens_a & tokens_b
    union = tokens_a | tokens_b
    return round(len(intersection) / len(union) * 100)

def main():
    if len(sys.argv) < 3:
        print("Usage: check-duplicate.py <free_text> <blog_dir>", file=sys.stderr)
        sys.exit(2)

    free_text = sys.argv[1]
    blog_dir = Path(sys.argv[2])
    query_tokens = tokenize(free_text)

    results = []
    for md_file in sorted(blog_dir.glob('*-fr.md')):
        content = md_file.read_text(encoding='utf-8', errors='ignore')
        title = extract_frontmatter_field(content, 'title')
        description = extract_frontmatter_field(content, 'description')
        status = extract_frontmatter_field(content, 'status')

        article_text = f"{title} {description}"
        article_tokens = tokenize(article_text)
        score = score_similarity(query_tokens, article_tokens)

        if score >= THRESHOLD:
            results.append({
                'slug': md_file.stem,
                'title': title,
                'score': score,
                'status': status,
            })

    results.sort(key=lambda x: x['score'], reverse=True)
    print(json.dumps(results, ensure_ascii=False, indent=2))
    sys.exit(1 if results else 0)

if __name__ == '__main__':
    main()
