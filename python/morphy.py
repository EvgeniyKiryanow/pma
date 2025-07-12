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
        input_data = json.loads(sys.argv[1])
    except json.JSONDecodeError:
        print(json.dumps({"error": "Invalid JSON input"}))
        sys.exit(1)

    if not isinstance(input_data, dict) or 'rank' not in input_data or 'position' not in input_data:
        print(json.dumps({"error": "Expected JSON with 'rank' and 'position' keys"}))
        sys.exit(1)

    result = {
        "rank": process_phrase(input_data['rank'], morph),
        "position": process_phrase(input_data['position'], morph)
    }

    print(json.dumps(result, ensure_ascii=False, indent=2))
