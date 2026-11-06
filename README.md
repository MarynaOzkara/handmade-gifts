# Motty Handmade — Міні інтернет-магазин

## Структура проєкту

```
motty-shop/
├── index.html          # Головна сторінка (каталог)
├── cart.html           # Кошик + оформлення замовлення
├── admin.html          # Адмінка
├── css/
│   ├── base.css        # Змінні, reset, кнопки, навбар, футер
│   ├── shop.css        # Каталог, картки, модальне вікно, кошик-drawer
│   ├── cart.css        # Сторінка оформлення замовлення
│   └── admin.css       # Адмінка, login, таблиці
├── js/
│   ├── data.js         # Товари, категорії, налаштування (РЕДАГУВАТИ ТУТ)
│   ├── store.js        # Стан: кошик, вибране, замовлення, Telegram
│   ├── catalog.js      # Рендер каталогу, фільтри, модальне вікно
│   ├── cart.js         # Сторінка оформлення
│   └── admin.js        # Адмінка: замовлення, товари, налаштування
└── README.md
```

---

## Швидкий старт

### 1. Хостинг на GitHub Pages

1. Створіть репозиторій на GitHub
2. Завантажте всі файли
3. Settings → Pages → Branch: main → Save
4. Ваш магазин: `https://yourname.github.io/repo-name/`

### 2. Хостинг на Netlify

1. Перетягніть папку `motty-shop/` на [netlify.com/drop](https://app.netlify.com/drop)
2. Отримаєте посилання одразу

---

## Налаштування Telegram Bot

Щоб замовлення надходили у Telegram:

1. Напишіть [@BotFather](https://t.me/BotFather) → `/newbot` → отримайте **Token**
2. Напишіть [@userinfobot](https://t.me/userinfobot) → отримайте ваш **Chat ID**
3. Відкрийте `js/data.js` і заповніть:

```js
const MOTTY_SETTINGS = {
  tgToken: '1234567890:ABCdefGHIjklMNOpqrsTUVwxyz',  // ← ваш токен
  tgChat:  '123456789',                                // ← ваш chat ID
  ...
};
```

---

## Адмінка

- Адреса: `/admin.html`
- PIN за замовчуванням: **1234**
- Змінити PIN: `js/data.js` → `adminPin: '1234'`

### Можливості адмінки:
- 📊 **Дашборд** — статистика, останні замовлення
- 📦 **Замовлення** — перегляд, зміна статусів, пошук, експорт CSV
- 🎁 **Товари** — перегляд всіх товарів, додавання власних
- ⚙️ **Налаштування** — контакти, Telegram токен

---

## Редагування товарів

Відкрийте `js/data.js`. Кожен товар:

```js
{
  id: 'p1',              // унікальний ID
  sku: 'M-101',          // артикул
  title: 'Назва',
  cat: 'decor',          // категорія (decor/jewelry/figures/holidays/print3d/personal)
  price: 890,            // ціна ₴
  old: 1100,             // стара ціна (0 = не показувати)
  badge: 'hit',          // hit / new / '' 
  stock: 'in',           // in / order / out
  left: 7,               // залишок (0 = необмежено)
  short: 'Короткий опис',
  desc: 'Повний опис',
  specs: 'Рядок\nРядок',
  options: ['Варіант 1', 'Варіант 2'],  // [] = без варіантів
  images: ['data:image/...'],           // base64 зображення
}
```

---

## Акцентний колір

`css/base.css` → `:root`:
```css
--acc:     #6E4146;   /* основний */
--acc-h:   #C89D8C;   /* hover */
```

---

## Статуси замовлень

| Статус | Значення |
|--------|----------|
| `new` | Нове |
| `process` | В роботі |
| `sent` | Відправлено |
| `done` | Виконано |
| `cancel` | Скасовано |

---

## Підключення Google Sheets

### 1. Створи таблицю

1. Відкрий [sheets.google.com](https://sheets.google.com) → нова таблиця
2. Перейменуй перший аркуш на `Замовлення`

### 2. Додай Apps Script

`Розширення → Apps Script` → вставити код → зберегти:

```js
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet()
                    .getSheetByName('Замовлення');

    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'ID','Дата','Ім\'я','Телефон','Telegram',
        'Товари','Сума (₴)','Доставка','Місто',
        'Відділення / Адреса','Оплата','Статус','Коментар'
      ]);
      sheet.getRange(1,1,1,13).setFontWeight('bold')
           .setBackground('#6E4146').setFontColor('#FFFFFF');
    }

    sheet.appendRow([
      data.id,
      new Date(data.date).toLocaleString('uk-UA'),
      data.name,
      data.phone,
      data.telegram || '',
      data.itemsText,
      data.total,
      data.delivery,
      data.city      || '',
      data.warehouse || '',
      data.payment,
      'new',
      data.comment   || ''
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

### 3. Деплой

1. `Деплой → Новий деплой`
2. Тип: **Веб-застосунок**
3. Виконувати як: **Я**
4. Доступ: **Всі**
5. Натисни **Деплой** → скопіюй URL

### 4. Вставити URL у магазин

`js/data.js`:
```js
sheetsUrl: 'https://script.google.com/macros/s/ТВІЙ_ID/exec',
```

> ⚠️ Після будь-яких змін у скрипті роби новий деплой (`Деплой → Керування деплоями → ✏️ редагувати → Нова версія`), інакше зміни не застосуються.

