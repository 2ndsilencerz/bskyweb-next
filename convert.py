import json
import uuid

def convert_to_mutable():
    try:
        # 1. Load the original blacklist
        with open('list.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
            blacklist = data.get("blacklist", [])
            # Also grab the dictionary items if you want them blocked
            #dictionary = data.get("dictionary", [])
            #full_list = blacklist + dictionary
            full_list = blacklist

        patterns = []

        # 2. Process each word into plain and hashtag versions
        for word in full_list:
            # Skip empty strings if any
            if not word:
                continue

            # Add plain version
            patterns.append({
                "id": str(uuid.uuid4())[:8], # Generates a short unique ID
                "patternType": "keyword",
                "word": word,
                "caseSensitive": False,
                "regex": {}
            })

            if word.startswith('#'):
                continue

            # Add hashtag version (skip if word already starts with #)
            hashtag_word = word if word.startswith('#') else f"#{word}"
            patterns.append({
                "id": str(uuid.uuid4())[:8],
                "patternType": "keyword",
                "word": hashtag_word,
                "caseSensitive": False,
                "regex": {}
            })

        # 3. Create the Mutable structure
        mutable_config = {
            "groups": {
                "default": {
                    "id": "default",
                    "name": "Default Group",
                    "patterns": patterns
                }
            },
            "websiteRules": {},
            "globalMuteAction": "blur-preview",
            "debugMode": False,
            "mutableEnabled": True,
            "enabledByDefault": True
        }

        # 4. Export the file
        output_file = 'mutable_final.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(mutable_config, f, ensure_ascii=False, separators=(',', ':'))

        print(f"Success! Exported {len(patterns)} entries to {output_file}")

    except FileNotFoundError:
        print("Error: 'list.json' not found in this directory.")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    convert_to_mutable()
