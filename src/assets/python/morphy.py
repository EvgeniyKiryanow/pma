import sys
import json
from pymorphy3 import MorphAnalyzer

if sys.platform.startswith("win"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def inflect_to_all_cases(parsed):
    cases = {
        'nomn': 'Називний',
        'gent': 'Родовий',
        'datv': 'Давальний',
        'accs': 'Знахідний',
        'ablt': 'Орудний',
        'loct': 'Місцевий',
        'voct': 'Кличний'
    }

    result = {}
    for code in cases.keys():
        inflected = parsed.inflect({code})
        result[code] = inflected.word if inflected else None
    return result

def process_phrase(phrase, morph):
    """
    Process full phrase (like 'молодший сержант роти') as individual words,
    morph each, and try to preserve order.
    """
    words = phrase.strip().split()
    processed = []

    for word in words:
        parsed = morph.parse(word)
        if not parsed:
            processed.append(word)
            continue

        best = parsed[0]
        inflected_cases = inflect_to_all_cases(best)
        processed.append({
            "word": word,
            "normal_form": best.normal_form,
            "tag": str(best.tag),
            "score": best.score,
            "cases": inflected_cases,
            "methods_stack": [str(m) for m in best.methods_stack],
        })

    return {
        "original": phrase,
        "parts": processed
    }

# 🧠 MAIN
if __name__ == '__main__':
    morph = MorphAnalyzer(lang='uk')

    if len(sys.argv) < 2:
        print(json.dumps({"error": "No input"}))
        sys.exit(1)

    try:
        phrase = json.loads(sys.argv[1])
    except json.JSONDecodeError:
        print(json.dumps({"error": "Invalid JSON input"}))
        sys.exit(1)

    if not isinstance(phrase, str):
        print(json.dumps({"error": "Expected a string input"}))
        sys.exit(1)

    result = process_phrase(phrase, morph)
    print(json.dumps(result, ensure_ascii=False, indent=2))
