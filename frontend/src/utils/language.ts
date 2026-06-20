import type { Language } from '@/types/domain'

export const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'python', label: 'Python' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'java', label: 'Java' }
]

export function languageLabel(lang: Language): string {
  return LANGUAGES.find((l) => l.value === lang)?.label ?? lang
}

/** CodeMirror 6 各语言扩展的动态 import。
 *  注：@codemirror/lang-cpp 仅暴露 cpp()，C 与 C++ 复用同一扩展。
 */
export const langExtensions = {
  python: () => import('@codemirror/lang-python').then((m) => m.python()),
  c: () => import('@codemirror/lang-cpp').then((m) => m.cpp()),
  cpp: () => import('@codemirror/lang-cpp').then((m) => m.cpp()),
  java: () => import('@codemirror/lang-java').then((m) => m.java())
}

export const DEFAULT_SAMPLE_CODE: Record<Language, string> = {
  python: `def add(a, b)
    return a + b
print(add(1, 2)
`,
  c: `#include <stdio.h>

int main() {
    int n = 10
    for (int i = 0; i < n; i++) {
        printf("%d\\n", i)
    }
    return 0
}
`,
  cpp: `#include <iostream>
using namespace std;

int main() {
    vector<int> v{1, 2, 3};
    for (int i = 0; i <= v.size(); i++) {
        cout << v[i] << endl;
    }
    return 0;
}
`,
  java: `public class Main {
    public static void main(String[] args) {
        int[] arr = new int[3];
        for (int i = 0; i <= 3; i++) {
            System.out.println(arr[i]);
        }
    }
}
`
}