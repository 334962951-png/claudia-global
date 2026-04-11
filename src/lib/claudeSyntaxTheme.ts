import { ThemeMode } from '@/contexts/ThemeContext';

/**
 * Claude-themed syntax highlighting theme factory
 * Returns different syntax themes based on the current theme mode
 *
 * Uses CSS custom properties (--color-token-*) defined in styles.css @theme
 * so colors automatically adapt to theme changes (dark/light/gray/white/custom).
 *
 * @param theme - The current theme mode
 * @returns Prism syntax highlighting theme object
 */
export const getClaudeSyntaxTheme = (_theme: ThemeMode): { [key: string]: React.CSSProperties } => {
  // CSS variables are theme-aware and defined per theme variant in styles.css
  const base = 'var(--color-foreground)';
  const background = 'transparent';
  const comment = 'var(--color-token-comment)';
  const punctuation = 'var(--color-token-punctuation)';
  const property = 'var(--color-token-property)';
  const tag = 'var(--color-token-tag)';
  const string = 'var(--color-token-string)';
  const fn = 'var(--color-token-function)';
  const keyword = 'var(--color-token-keyword)';
  const variable = 'var(--color-token-variable)';
  const operator = 'var(--color-token-operator)';
  const number = 'var(--color-token-number)';
  const bool = 'var(--color-token-boolean)';
  const constant = 'var(--color-token-constant)';
  const annotation = 'var(--color-token-annotation)';
  const namespace = 'var(--color-token-namespace)';
  const type = 'var(--color-token-type)';
  const template = 'var(--color-token-template)';

  return {
    'code[class*="language-"]': {
      color: base,
      background,
      textShadow: 'none',
      fontFamily: 'var(--font-mono)',
      fontSize: '0.875em',
      textAlign: 'left',
      whiteSpace: 'pre',
      wordSpacing: 'normal',
      wordBreak: 'normal',
      wordWrap: 'normal',
      lineHeight: '1.5',
      MozTabSize: '4',
      OTabSize: '4',
      tabSize: '4',
      WebkitHyphens: 'none',
      MozHyphens: 'none',
      msHyphens: 'none',
      hyphens: 'none',
    },
    'pre[class*="language-"]': {
      color: base,
      background,
      textShadow: 'none',
      fontFamily: 'var(--font-mono)',
      fontSize: '0.875em',
      textAlign: 'left',
      whiteSpace: 'pre',
      wordSpacing: 'normal',
      wordBreak: 'normal',
      wordWrap: 'normal',
      lineHeight: '1.5',
      MozTabSize: '4',
      OTabSize: '4',
      tabSize: '4',
      WebkitHyphens: 'none',
      MozHyphens: 'none',
      msHyphens: 'none',
      hyphens: 'none',
      padding: '1em',
      margin: '0',
      overflow: 'auto',
    },
    ':not(pre) > code[class*="language-"]': {
      background: 'var(--color-token-inline-code-bg)',
      padding: '0.1em 0.3em',
      borderRadius: '0.3em',
      whiteSpace: 'normal',
    },
    'comment': {
      color: comment,
      fontStyle: 'italic',
    },
    'prolog': {
      color: comment,
    },
    'doctype': {
      color: comment,
    },
    'cdata': {
      color: comment,
    },
    'punctuation': {
      color: punctuation,
    },
    'namespace': {
      color: namespace,
    },
    'property': {
      color: property,
    },
    'tag': {
      color: tag,
    },
    'boolean': {
      color: bool,
    },
    'number': {
      color: number,
    },
    'constant': {
      color: constant,
    },
    'symbol': {
      color: constant,
    },
    'deleted': {
      color: 'var(--color-token-deleted)',
    },
    'selector': {
      color: variable,
    },
    'attr-name': {
      color: variable,
    },
    'string': {
      color: string,
    },
    'char': {
      color: string,
    },
    'builtin': {
      color: tag,
    },
    'url': {
      color: string,
    },
    'inserted': {
      color: string,
    },
    'entity': {
      color: variable,
      cursor: 'help',
    },
    'atrule': {
      color: keyword,
    },
    'attr-value': {
      color: string,
    },
    'keyword': {
      color: keyword,
    },
    'function': {
      color: fn,
    },
    'class-name': {
      color: type,
    },
    'regex': {
      color: 'var(--color-token-regex)',
    },
    'important': {
      color: property,
      fontWeight: 'bold',
    },
    'variable': {
      color: variable,
    },
    'bold': {
      fontWeight: 'bold',
    },
    'italic': {
      fontStyle: 'italic',
    },
    'operator': {
      color: operator,
    },
    'script': {
      color: base,
    },
    'parameter': {
      color: property,
    },
    'method': {
      color: fn,
    },
    'field': {
      color: property,
    },
    'annotation': {
      color: annotation,
    },
    'type': {
      color: type,
    },
    'module': {
      color: namespace,
    },
    'template': {
      color: template,
    },
    'template-string': {
      color: template,
    },
  };
};

// Export default dark theme for backward compatibility
export const claudeSyntaxTheme = getClaudeSyntaxTheme('dark');
