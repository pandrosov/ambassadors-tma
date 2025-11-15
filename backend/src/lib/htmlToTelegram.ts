/**
 * Конвертация HTML в Telegram форматирование
 * Поддерживает: bold, italic, underline, strikethrough, links, списки
 */

export function htmlToTelegram(html: string): string {
  if (!html) return '';

  // Создаем временный DOM элемент для парсинга HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  function convertNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    const element = node as Element;
    const tagName = element.tagName.toLowerCase();
    const children = Array.from(element.childNodes)
      .map(child => convertNode(child))
      .join('');

    switch (tagName) {
      case 'strong':
      case 'b':
        return `*${children}*`;
      
      case 'em':
      case 'i':
        return `_${children}_`;
      
      case 'u':
        return `__${children}__`;
      
      case 's':
      case 'strike':
      case 'del':
        return `~${children}~`;
      
      case 'a':
        const href = element.getAttribute('href');
        if (href) {
          return `[${children}](${href})`;
        }
        return children;
      
      case 'ul':
        return '\n' + children + '\n';
      
      case 'ol':
        return '\n' + children + '\n';
      
      case 'li':
        const parent = element.parentElement;
        if (parent && parent.tagName.toLowerCase() === 'ol') {
          const index = Array.from(parent.children).indexOf(element) + 1;
          return `${index}. ${children}\n`;
        } else {
          return `• ${children}\n`;
        }
      
      case 'p':
        return children + '\n\n';
      
      case 'br':
        return '\n';
      
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        return `*${children}*\n\n`;
      
      case 'div':
        return children + '\n';
      
      default:
        return children;
    }
  }

  let result = convertNode(doc.body);
  
  // Очищаем множественные переносы строк
  result = result.replace(/\n{3,}/g, '\n\n');
  
  // Убираем лишние пробелы в начале и конце
  result = result.trim();
  
  return result;
}

/**
 * Альтернативная реализация через регулярные выражения (для серверной стороны)
 */
export function htmlToTelegramSimple(html: string): string {
  if (!html) return '';

  let text = html;

  // Удаляем HTML комментарии
  text = text.replace(/<!--[\s\S]*?-->/g, '');

  // Конвертируем теги
  text = text.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '*$1*');
  text = text.replace(/<b[^>]*>(.*?)<\/b>/gi, '*$1*');
  text = text.replace(/<em[^>]*>(.*?)<\/em>/gi, '_$1_');
  text = text.replace(/<i[^>]*>(.*?)<\/i>/gi, '_$1_');
  text = text.replace(/<u[^>]*>(.*?)<\/u>/gi, '__$1__');
  text = text.replace(/<s[^>]*>(.*?)<\/s>/gi, '~$1~');
  text = text.replace(/<strike[^>]*>(.*?)<\/strike>/gi, '~$1~');
  text = text.replace(/<del[^>]*>(.*?)<\/del>/gi, '~$1~');

  // Обрабатываем ссылки
  text = text.replace(/<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)');

  // Обрабатываем списки
  text = text.replace(/<ul[^>]*>/gi, '\n');
  text = text.replace(/<\/ul>/gi, '\n');
  text = text.replace(/<ol[^>]*>/gi, '\n');
  text = text.replace(/<\/ol>/gi, '\n');
  
  // Маркированные списки
  text = text.replace(/<li[^>]*>(.*?)<\/li>/gi, (match, content) => {
    const cleaned = content.replace(/<[^>]+>/g, '').trim();
    return `• ${cleaned}\n`;
  });

  // Заголовки
  text = text.replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '*$1*\n\n');

  // Параграфы и переносы строк
  text = text.replace(/<p[^>]*>/gi, '');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<br[^>]*\/?>/gi, '\n');
  text = text.replace(/<div[^>]*>/gi, '');
  text = text.replace(/<\/div>/gi, '\n');

  // Удаляем все оставшиеся HTML теги
  text = text.replace(/<[^>]+>/g, '');

  // Декодируем HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");

  // Очищаем множественные переносы строк
  text = text.replace(/\n{3,}/g, '\n\n');

  // Убираем лишние пробелы
  text = text.trim();

  return text;
}

