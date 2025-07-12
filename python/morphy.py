import sys
import json
from pymorphy3 import MorphAnalyzer

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

def process_word(word, morph):
    parsed = morph.parse(word)
    if not parsed:
        return {"word": word, "error": "Not recognized"}

    best = parsed[0]
    all_cases = inflect_to_all_cases(best)

    return {
        "word": word,
        "normal_form": best.normal_form,
        "tag": str(best.tag),
        "score": best.score,
        "cases": all_cases,
        "methods_stack": [str(m) for m in best.methods_stack],
    }

# ✅ Only one main section now
if __name__ == '__main__':
    morph = MorphAnalyzer(lang='uk')

    if len(sys.argv) < 2:
        print(json.dumps({"error": "No input"}))
        sys.exit(1)

    try:
        words = json.loads(sys.argv[1])
    except json.JSONDecodeError:
        print(json.dumps({"error": "Invalid JSON input"}))
        sys.exit(1)

    results = [process_word(word, morph) for word in words]
    print(json.dumps(results, ensure_ascii=False, indent=2))
