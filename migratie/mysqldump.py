"""Minimal MySQL dump reader: yields (table, columns, rows) from CREATE TABLE + INSERT statements."""
import re, sys, json, pickle

def parse_values(s, i):
    rows = []
    n = len(s)
    while i < n:
        while i < n and s[i] in ' ,\n\r\t': i += 1
        if i >= n or s[i] == ';': return rows, i + 1
        assert s[i] == '(', (s[i:i+50])
        i += 1
        row = []
        while True:
            while s[i] in ' \n': i += 1
            c = s[i]
            if c == "'":
                i += 1; buf = []
                while True:
                    c = s[i]
                    if c == '\\':
                        nx = s[i+1]
                        buf.append({'n': '\n', 'r': '\r', 't': '\t', '0': '\0', 'Z': '\x1a'}.get(nx, nx)); i += 2
                    elif c == "'":
                        if s[i+1] == "'": buf.append("'"); i += 2
                        else: i += 1; break
                    else:
                        j = i
                        while s[j] not in "\\'": j += 1
                        buf.append(s[i:j]); i = j
                row.append(''.join(buf))
            else:
                j = i
                while s[j] not in ',)': j += 1
                tok = s[i:j].strip(); i = j
                row.append(None if tok == 'NULL' else tok)
            while s[i] == ' ': i += 1
            if s[i] == ',': i += 1; continue
            if s[i] == ')': i += 1; break
        rows.append(row)
    return rows, i

def load(path, want):
    s = open(path, encoding='utf-8', errors='replace').read()
    cols = {}
    for m in re.finditer(r"CREATE TABLE `(\w+)` \((.*?)\n\)", s, re.S):
        t = m.group(1)
        if t in want:
            cols[t] = re.findall(r"^\s+`(\w+)`", m.group(2), re.M)
    data = {t: [] for t in want}
    for m in re.finditer(r"INSERT INTO `(\w+)` (?:\([^)]*\) )?VALUES\s*", s):
        t = m.group(1)
        if t not in want: continue
        rows, _ = parse_values(s, m.end())
        data[t].extend(rows)
    return {t: [dict(zip(cols[t], r)) for r in data[t]] for t in want if t in cols}

if __name__ == '__main__':
    path, out, *tables = sys.argv[1:]
    d = load(path, set(tables))
    pickle.dump(d, open(out, 'wb'))
    for t, rows in d.items(): print(t, len(rows))
