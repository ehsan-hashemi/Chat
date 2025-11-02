const API_BASE_URL = 'https://echat.liara.run';
const DEFAULT_AVATAR = 'https://echat.liara.run/icon.png';

class EChat {
    constructor() {
        this.currentUser = null;
        this.contacts = [];
        this.activeContact = null;
        this.init();
    }

    async init() {
        this.checkAuth();
        this.setupEventListeners();
        
        if (this.isChatPage()) {
            await this.loadUserData();
            await this.loadContacts();
            this.renderContacts();
        }
    }

    isLoginPage() {
        return document.querySelector('.login-container') !== null;
    }

    isChatPage() {
        return document.querySelector('.chat-container') !== null;
    }

    checkAuth() {
        const savedUser = localStorage.getItem('eChat_user');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
        }

        if (this.isLoginPage() && this.currentUser) {
            window.location.href = 'chat.html';
        } else if (this.isChatPage() && !this.currentUser) {
            window.location.href = 'index.html';
        }
    }

    async apiCall(endpoint, options = {}) {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            this.showError('خطا در ارتباط با سرور');
            return null;
        }
    }

    async login(userData) {
        const result = await this.apiCall('/api/auth', {
            method: 'POST',
            body: JSON.stringify(userData)
        });

        if (result && result.success) {
            this.currentUser = result.user;
            localStorage.setItem('eChat_user', JSON.stringify(this.currentUser));
            window.location.href = 'chat.html';
        } else {
            this.showError(result?.message || 'خطا در ورود');
        }
    }

    async loadUserData() {
        if (!this.currentUser) return;
        
        // نمایش اطلاعات کاربر
        document.getElementById('currentUserName').textContent = this.currentUser.name;
        document.getElementById('currentUserId').textContent = `@${this.currentUser.userId}`;
        document.getElementById('currentUserProfilePic').src = this.currentUser.profilePic || DEFAULT_AVATAR;
    }

    async loadContacts() {
        const users = await this.apiCall(`/api/users?currentUser=${this.currentUser.phone}`);
        if (users) {
            this.contacts = users;
        }
    }

    renderContacts() {
        const contactList = document.getElementById('contactList');
        contactList.innerHTML = '';

        this.contacts.forEach(contact => {
            const contactElement = this.createContactElement(contact);
            contactList.appendChild(contactElement);
        });
    }

    createContactElement(contact) {
        const div = document.createElement('div');
        div.className = 'contact-item';
        div.innerHTML = `
            <img src="${contact.profilePic || DEFAULT_AVATAR}" alt="${contact.name}">
            <div class="contact-info">
                <h5>${contact.name}</h5>
                <small>@${contact.userId}</small>
            </div>
            ${contact.userId === 'support' ? '<span class="verified-badge"><i class="fas fa-check-circle"></i></span>' : ''}
        `;

        div.addEventListener('click', () => this.selectContact(contact));
        return div;
    }

    async selectContact(contact) {
        this.activeContact = contact;
        this.showChatScreen();
        await this.loadMessages(contact);
    }

    async loadMessages(contact) {
        const messages = await this.apiCall(
            `/api/messages?user1=${this.currentUser.phone}&user2=${contact.phone}`
        );

        if (messages) {
            this.renderMessages(messages);
        }
    }

    renderMessages(messages) {
        const messagesContainer = document.getElementById('messages');
        messagesContainer.innerHTML = '';

        messages.forEach(message => {
            const messageElement = this.createMessageElement(message);
            messagesContainer.appendChild(messageElement);
        });

        this.scrollToBottom();
    }

    createMessageElement(message) {
        const div = document.createElement('div');
        const isSent = message.senderPhone === this.currentUser.phone;
        
        div.className = `message ${isSent ? 'sent' : 'received'}`;
        
        let content = this.processMessageContent(message.content);
        if (message.message_type === 'image') {
            content = `<img src="${message.fileUrl}" alt="تصویر" class="message-image">`;
            if (message.caption) {
                content += `<div class="caption">${this.processMessageContent(message.caption)}</div>`;
            }
        }

        div.innerHTML = `
            <div class="message-content">${content}</div>
            <div class="message-time">${this.formatTime(message.timestamp)}</div>
            ${isSent ? '<div class="message-status"><i class="fas fa-check-double"></i></div>' : ''}
        `;

        return div;
    }

    processMessageContent(content) {
        // تبدیل @آیدی به لینک
        content = content.replace(/@(\w+)/g, '<a href="#" class="user-mention" data-user="$1">@$1</a>');
        
        // تبدیل لینک‌ها
        content = content.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
        
        // تبدیل دامنه‌های ساده
        content = content.replace(/(\w+\.\w{2,})/g, '<a href="http://$1" target="_blank">$1</a>');
        
        return content;
    }

    async sendMessage(content, type = 'text', file = null) {
        if (!this.activeContact) return;

        const messageData = {
            senderPhone: this.currentUser.phone,
            receiverPhone: this.activeContact.phone,
            content: content,
            type: type,
            fileSize: file ? file.size : 0
        };

        const result = await this.apiCall('/api/messages', {
            method: 'POST',
            body: JSON.stringify(messageData)
        });

        if (result && result.success) {
            await this.loadMessages(this.activeContact);
            this.clearMessageInput();
        } else {
            this.showError(result?.message || 'خطا در ارسال پیام');
        }
    }

    setupEventListeners() {
        if (this.isLoginPage()) {
            this.setupLoginListeners();
        } else if (this.isChatPage()) {
            this.setupChatListeners();
        }
    }

    setupLoginListeners() {
        const loginForm = document.getElementById('loginForm');
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
    }

    setupChatListeners() {
        const chatForm = document.getElementById('chatForm');
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSendMessage();
        });

        document.getElementById('addContactBtn').addEventListener('click', () => {
            this.showAddContactModal();
        });

        document.getElementById('backToContactsBtn').addEventListener('click', () => {
            this.hideChatScreen();
        });

        // جستجو در مخاطبین
        document.getElementById('searchContacts').addEventListener('input', (e) => {
            this.filterContacts(e.target.value);
        });
    }

    async handleLogin() {
        const formData = new FormData(document.getElementById('loginForm'));
        const userData = {
            name: formData.get('name'),
            phone: formData.get('phone'),
            userId: formData.get('userId'),
            password: formData.get('password')
        };

        const profilePicFile = document.getElementById('profilePic').files[0];
        if (profilePicFile) {
            userData.profilePic = await this.fileToBase64(profilePicFile);
        }

        await this.login(userData);
    }

    async handleSendMessage() {
        const messageInput = document.getElementById('msg');
        const content = messageInput.value.trim();
        const fileInput = document.getElementById('fileInput');
        const file = fileInput.files[0];

        if (content || file) {
            await this.sendMessage(content, file ? 'image' : 'text', file);
        }
    }

    showChatScreen() {
        document.getElementById('welcomeScreen').style.display = 'none';
        document.getElementById('chatScreen').style.display = 'flex';
        
        document.getElementById('chattingWith').textContent = this.activeContact.name;
        document.getElementById('contactUserId').textContent = `@${this.activeContact.userId}`;
        document.getElementById('contactProfilePic').src = this.activeContact.profilePic || DEFAULT_AVATAR;
    }

    hideChatScreen() {
        document.getElementById('chatScreen').style.display = 'none';
        document.getElementById('welcomeScreen').style.display = 'flex';
        this.activeContact = null;
    }

    showAddContactModal() {
        // پیاده‌سازی مودال افزودن مخاطب
        const userId = prompt('آیدی مخاطب را وارد کنید:');
        if (userId) {
            this.addContactByUserId(userId);
        }
    }

    async addContactByUserId(userId) {
        // این تابع نیاز به پیاده‌سازی endpoint جداگانه دارد
        this.showError('این قابلیت به زودی اضافه خواهد شد');
    }

    filterContacts(searchTerm) {
        const contacts = document.querySelectorAll('.contact-item');
        contacts.forEach(contact => {
            const name = contact.querySelector('h5').textContent.toLowerCase();
            const userId = contact.querySelector('small').textContent.toLowerCase();
            const search = searchTerm.toLowerCase();
            
            if (name.includes(search) || userId.includes(search)) {
                contact.style.display = 'flex';
            } else {
                contact.style.display = 'none';
            }
        });
    }

    scrollToBottom() {
        const messagesContainer = document.getElementById('messages');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    clearMessageInput() {
        document.getElementById('msg').value = '';
        document.getElementById('fileInput').value = '';
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('fa-IR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    async fileToBase64(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
    }

    showError(message) {
        const errorElement = document.getElementById('error-message') || 
                           this.createErrorElement();
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 5000);
    }

    createErrorElement() {
        const div = document.createElement('div');
        div.id = 'error-message';
        div.style.cssText = 'color: red; display: none; margin-top: 10px;';
        document.querySelector('form').appendChild(div);
        return div;
    }
}

// راه‌اندازی برنامه
document.addEventListener('DOMContentLoaded', () => {
    window.eChat = new EChat();
});