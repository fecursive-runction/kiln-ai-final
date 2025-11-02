#!/usr/bin/env python3
import sys
import re

def remove_comments(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading file {file_path}: {e}")
        return

    if file_path.endswith('.md'):
        # Remove <!-- --> comments
        content = re.sub(r'<!--[\s\S]*?-->', '', content)
    else:
        # Remove // and /* */ comments
        content = re.sub(r'//.*', '', content)
        content = re.sub(r'/\*[\s\S]*?\*/', '', content)

    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
    except Exception as e:
        print(f"Error writing to file {file_path}: {e}")

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: ./comment_remover.py <file_path>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    remove_comments(file_path)
