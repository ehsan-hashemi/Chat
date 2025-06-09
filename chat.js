// تشخیص زبان مرورگر و تنظیم زبان
document.addEventListener('DOMContentLoaded', function() {
    const userLang = navigator.language || navigator.userLanguage; 
    const supportedLangs = ['fa', 'en', 'ar']; // زبان‌های پشتیبانی‌شده
    let currentLang = 'en'; // پیش‌فرض زبان انگلیسی

    if (supportedLangs.includes(userLang)) {
        currentLang = userLang; // اگر زبان مرورگر پشتیبانی‌شده است، از آن استفاده می‌کنیم
    } else {
        currentLang = 'en'; // اگر زبان پشتیبانی‌شده نیست، زبان انگلیسی انتخاب می‌شود
    }

    // تغییر زبان صفحه (بارگذاری فایل زبان مربوطه)
    loadLanguage(currentLang);

    // بارگذاری تم پیش‌فرض
    loadTheme(localStorage.getItem('theme') || 'green'); // اگر تم ذخیره‌شده در لوکال استور موجود باشد، استفاده می‌شود
});

// بارگذاری زبان
function loadLanguage(lang) {
    fetch(/lang/${lang}.json)
        .then(response => response.json())
        .then(data => {
            applyLanguage(data);
        });
}

// اعمال ترجمه‌ها در صفحه
function applyLanguage(languageData) {
    document.querySelectorAll('[data-lang]').forEach(element => {
        const key = element.getAttribute('data-lang');
        if (languageData[key]) {
            element.textContent = languageData[key];
        }
    });
}

// تغییر تم
function changeTheme(theme) {
    document.body.classList.remove('green-theme', 'blue-theme', 'pink-theme', 'orange-theme', 'yellow-theme', 'white-theme');
    document.body.classList.add(${theme}-theme);
    localStorage.setItem('theme', theme); // ذخیره‌سازی تم انتخابی
}

// انتخاب تم
const themeSelector = document.getElementById('theme-selector');
themeSelector.addEventListener('click', function(event) {
    if (event.target.classList.contains('theme-option')) {
        const theme = event.target.classList[1]; // گرفتن رنگ تم از کلاس
        changeTheme(theme);
    }
});

// ارسال پیام
function sendMessage() {
    const messageInput = document.getElementById('message-input');
    const message = messageInput.value.trim();

    if (message !== '') {
        displayMessage(message, 'sent');
        // ارسال پیام به سرور (مثال)
        fetch('/send-message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message })
        })
        .then(response => response.json())
        .then(data => {
            console.log('Message sent successfully:', data);
        })
        .catch(error => {
            console.error('Error:', error);
        });
        messageInput.value = ''; // پاک کردن ورودی
    }
}

// نمایش پیام
function displayMessage(message, type) {
    const messageContainer = document.getElementById('message-container');
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', type);
    messageElement.textContent = message;
    messageContainer.appendChild(messageElement);
    messageContainer.scrollTop = messageContainer.scrollHeight; // اسکرول به پایین
}

// دریافت پیام‌ها از سرور (مثال ساده)
function fetchMessages() {
    fetch('/get-messages')
        .then(response => response.json())
        .then(data => {
            data.messages.forEach(msg => {
                displayMessage(msg.text, msg.type); // نمایش پیام‌ها
            });
        })
        .catch(error => {
            console.error('Error fetching messages:', error);
        });
}

// بارگذاری پیام‌ها هر 1 ثانیه
setInterval(fetchMessages, 1000); // درخواست به سرور برای دریافت پیام‌های جدید