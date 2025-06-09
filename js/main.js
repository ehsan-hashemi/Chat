document.addEventListener('DOMContentLoaded', () => {

    // عکس پروفایل پیش‌فرض
    const DEFAULT_AVATAR_URL = 'https://dbkhatam.ir/images/person_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24.svg';

    // شبیه‌سازی پایگاه داده در localStorage
    const db = {
        get: () => JSON.parse(localStorage.getItem('chatAppLocalDB_v2')) || { currentUser: null, contacts: [], messages: {} },
        save: (data) => localStorage.setItem('chatAppLocalDB_v2', JSON.stringify(data)),
    };

    // تشخیص صفحه
    if (document.querySelector('.login-container')) {
        handleLoginPage();
    } else if (document.querySelector('.chat-container')) {
        handleChatPage();
    }

    // --- مدیریت صفحه لاگین ---
    function handleLoginPage() {
        const loginForm = document.getElementById('loginForm');
        const profilePicInput = document.getElementById('profilePic'); // Keep this input

        if (db.get().currentUser) {
            window.location.href = 'chat.html';
            return;
        }

        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('name').value;
            const phone = document.getElementById('phone').value;
            const userId = document.getElementById('userId').value;
            const profilePicFile = profilePicInput.files[0];

            const data = db.get();
            data.currentUser = { name, phone, userId, profilePic: DEFAULT_AVATAR_URL }; // Default if no file

            if (profilePicFile) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    data.currentUser.profilePic = event.target.result;
                    db.save(data);
                    window.location.href = 'chat.html';
                };
                reader.readAsDataURL(profilePicFile);
            } else {
                db.save(data);
                window.location.href = 'chat.html';
            }
        });
    }


    // --- مدیریت صفحه چت ---
    function handleChatPage() {
        let data = db.get();
        let activeContactPhone = null;
        let contextMenuContactPhone = null;

        if (!data.currentUser) {
            window.location.href = 'index.html';
            return;
        }

        // المان‌های صفحه
        const welcomeScreen = document.getElementById('welcomeScreen');
        const chatScreen = document.getElementById('chatScreen');
        const contactListEl = document.getElementById('contactList');
        const messagesEl = document.getElementById('messages');
        const chatForm = document.getElementById('chatForm');
        const msgInput = document.getElementById('msg');
        const contextMenu = document.getElementById('contextMenu');
        const settingsBtn = document.getElementById('settingsBtn');
        const settingsModal = document.getElementById('settingsModal');
        const closeButton = settingsModal.querySelector('.close-button');
        const logoutBtn = document.getElementById('logoutBtn');

        // Settings Form Elements
        const settingsForm = document.getElementById('settingsForm');
        const settingNameInput = document.getElementById('settingName');
        const settingPhoneInput = document.getElementById('settingPhone');
        const settingUserIdInput = document.getElementById('settingUserId');
        const settingProfilePicInput = document.getElementById('settingProfilePic'); // NEW: For profile pic upload
        const saveSettingsBtn = document.getElementById('saveSettingsBtn');


        // نمایش اطلاعات کاربر
        // اینها در renderEverything() هم آپدیت می‌شوند
        // document.getElementById('currentUserName').textContent = data.currentUser.name;
        // document.getElementById('currentUserProfilePic').src = data.currentUser.profilePic || DEFAULT_AVATAR_URL;

        // ---- شروع منطق منوی کلیک راست ----
        function showContextMenu(e) {
            e.preventDefault();
            contextMenuContactPhone = e.currentTarget.dataset.phone;
            contextMenu.style.display = 'block';
            contextMenu.style.top = `${e.pageY}px`;
            contextMenu.style.right = `${window.innerWidth - e.pageX}px`; // برای راست‌چین
        }

        function hideContextMenu() {
            contextMenu.style.display = 'none';
            contextMenuContactPhone = null;
        }

        window.addEventListener('click', hideContextMenu); // Close context menu on any click

        document.getElementById('menu-rename').addEventListener('click', () => {
            const contact = data.contacts.find(c => c.phone === contextMenuContactPhone);
            if (!contact) return;
            const newName = prompt("نام جدید را وارد کنید:", contact.name);
            if (newName && newName.trim()) {
                contact.name = newName.trim();
                db.save(data);
                renderEverything();
            }
        });

        // NEW: Change contact profile picture
        document.getElementById('menu-change-contact-pic').addEventListener('click', () => {
            const contact = data.contacts.find(c => c.phone === contextMenuContactPhone);
            if (!contact) return;

            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'image/*';
            fileInput.style.display = 'none'; // Hide the input element

            fileInput.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(event) {
                        contact.profilePic = event.target.result;
                        db.save(data);
                        renderEverything();
                    };
                    reader.readAsDataURL(file);
                }
            };
            fileInput.click(); // Programmatically click the hidden input
        });


        document.getElementById('menu-delete-messages').addEventListener('click', () => {
            if (confirm(`آیا از حذف تمام پیام‌های این مخاطب مطمئن هستید؟`)) {
                data.messages[contextMenuContactPhone] = [];
                db.save(data);
                if (activeContactPhone === contextMenuContactPhone) {
                    renderMessages(activeContactPhone);
                }
            }
        });

        document.getElementById('menu-mark-read').addEventListener('click', () => {
             // این قابلیت در نسخه محلی بیشتر نمایشی است
             alert("پیام‌ها خوانده شده در نظر گرفته شدند.");
        });

        document.getElementById('menu-delete-contact').addEventListener('click', () => {
            if (confirm(`آیا از حذف این مخاطب مطمئن هستید؟`)) {
                data.contacts = data.contacts.filter(c => c.phone !== contextMenuContactPhone);
                delete data.messages[contextMenuContactPhone];
                db.save(data);
                if (activeContactPhone === contextMenuContactPhone) {
                    activeContactPhone = null;
                }
                renderEverything();
            }
        });
        // ---- پایان منطق منوی کلیک راست ----


        // ---- شروع منطق رندر کردن و نمایش ----
        function renderContacts() {
            contactListEl.innerHTML = '';
            data.contacts.forEach(contact => {
                const contactDiv = document.createElement('div');
                contactDiv.className = 'contact-item';
                contactDiv.dataset.phone = contact.phone;
                if (contact.phone === activeContactPhone) contactDiv.classList.add('active');

                // از profilePic مخاطب استفاده می‌کنیم، اگر نبود از DEFAULT_AVATAR_URL
                contactDiv.innerHTML = `<img src="${contact.profilePic || DEFAULT_AVATAR_URL}" alt="${contact.name}">
                    <div class="contact-info"><h5>${contact.name}</h5><small>${contact.phone}</small></div>`;

                contactDiv.addEventListener('click', () => {
                    activeContactPhone = contact.phone;
                    // شبیه‌سازی خواندن پیام‌ها: تمام پیام‌های دریافتی خوانده می‌شوند
                    const chatHistory = data.messages[activeContactPhone] || [];
                    chatHistory.forEach(msg => {
                        if (msg.type === 'received') msg.status = 'read';
                    });
                    db.save(data);
                    renderEverything();
                });

                // اتصال رویداد کلیک راست
                contactDiv.addEventListener('contextmenu', showContextMenu);
                contactListEl.appendChild(contactDiv);
            });
        }

        function renderMessages(phone) {
            messagesEl.innerHTML = '';
            const chatHistory = data.messages[phone] || [];
            chatHistory.forEach(appendMessage);
            messagesEl.scrollTop = messagesEl.scrollHeight; // Scroll to bottom after rendering
        }

        function appendMessage(msg) {
            const messageDiv = document.createElement('div');
            messageDiv.classList.add('message', msg.type);

            let contentHTML = '';
            if (msg.fileContent) {
                contentHTML = `<img src="${msg.fileContent}" style="max-width: 100%; border-radius: 10px;" />`;
            } else {
                contentHTML = msg.text;
            }

            // منطق تیک‌ها
            let ticksHTML = '';
            if (msg.type === 'sent') {
                let tickClass = '';
                switch (msg.status) {
                    case 'read': tickClass = 'icon-read'; break;
                    case 'delivered': tickClass = 'icon-delivered'; break;
                    default: tickClass = 'icon-sent';
                }
                ticksHTML = `<div class="message-meta"><div class="message-ticks ${tickClass}"></div></div>`;
            }

            messageDiv.innerHTML = `<div>${contentHTML}</div>${ticksHTML}`;
            messagesEl.appendChild(messageDiv);
            messagesEl.scrollTop = messagesEl.scrollHeight;
        }

        function renderEverything() {
            data = db.get(); // دریافت آخرین اطلاعات
            if (activeContactPhone) {
                const contact = data.contacts.find(c => c.phone === activeContactPhone);
                if (!contact) { // اگر مخاطب فعال حذف شده باشد
                    activeContactPhone = null;
                }
            }

            if (activeContactPhone) {
                const contact = data.contacts.find(c => c.phone === activeContactPhone);
                chatScreen.style.display = 'flex';
                welcomeScreen.style.display = 'none';
                document.getElementById('chattingWith').textContent = contact.name;
                document.getElementById('contactProfilePic').src = contact.profilePic || DEFAULT_AVATAR_URL; // از profilePic مخاطب استفاده می‌کنیم
                renderMessages(activeContactPhone);
            } else {
                chatScreen.style.display = 'none';
                welcomeScreen.style.display = 'flex';
            }
            renderContacts();
            // Update current user profile pic in sidebar
            document.getElementById('currentUserName').textContent = data.currentUser.name;
            document.getElementById('currentUserProfilePic').src = data.currentUser.profilePic || DEFAULT_AVATAR_URL; // از profilePic کاربر استفاده می‌کنیم
        }

        // --- AI Response Logic ---
        function generateAIResponse(userMessage) {
            const lowerCaseMsg = userMessage.toLowerCase();
            if (lowerCaseMsg.includes('سلام') || lowerCaseMsg.includes('درود')) {
                return 'سلام! حال شما چطوره؟';
            } else if (lowerCaseMsg.includes('خوبی؟') || lowerCaseMsg.includes('چطوری؟')) {
                return 'من خوبم ممنون! شما چطورید؟';
            } else if (lowerCaseMsg.includes('اسمت چیه؟') || lowerCaseMsg.includes('کی هستی؟')) {
                return 'من یک هوش مصنوعی هستم و اسمی ندارم. من توسط شما ساخته شدم!';
            } else if (lowerCaseMsg.includes('ممنون') || lowerCaseMsg.includes('متشکرم')) {
                return 'خواهش می‌کنم!';
            } else if (lowerCaseMsg.includes('خدانگهدار') || lowerCaseMsg.includes('بای') || lowerCaseMsg.includes('به امید دیدار')) {
                return 'خدانگهدار! روز خوبی داشته باشید.';
            } else if (lowerCaseMsg.includes('ساعت چنده؟')) {
                const now = new Date();
                return `ساعت الان ${now.getHours()}:${now.getMinutes()} هست.`;
            } else if (lowerCaseMsg.includes('تاریخ چنده؟')) {
                const now = new Date();
                return `امروز ${now.toLocaleDateString('fa-IR')} هست.`;
            } else if (lowerCaseMsg.includes('کمک')) {
                return 'چطور میتونم کمکتون کنم؟';
            }
            return 'متاسفانه پیام شما را متوجه نشدم. لطفا واضح‌تر بگویید.';
        }


        // ---- شروع منطق رویدادها ----
        document.getElementById('addContactBtn').addEventListener('click', () => {
            const name = prompt("نام مخاطب:");
            const phone = prompt("شماره تلفن مخاطب (مثال: 09123456789):");
            // Basic validation for phone number format
            const phoneRegex = /^09[0-9]{9}$/;
            if (name && phone && phoneRegex.test(phone)) {
                // Check if contact already exists
                if (data.contacts.some(c => c.phone === phone)) {
                    alert("مخاطبی با این شماره تلفن از قبل وجود دارد.");
                    return;
                }
                data.contacts.push({ name, phone, profilePic: DEFAULT_AVATAR_URL }); // با عکس پیش‌فرض اضافه می‌شود
                db.save(data);
                renderContacts();
            } else if (name || phone) { // If one field is filled but invalid
                alert("لطفا نام و شماره تلفن معتبر (مثال: 09123456789) را وارد کنید.");
            }
        });

        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = msgInput.value.trim(); // Trim whitespace
            if (!text || !activeContactPhone) return;

            // 1. ایجاد و ذخیره پیام ارسالی
            const message = {
                id: Date.now(), // آیدی منحصر به فرد برای هر پیام
                type: 'sent',
                text: text,
                status: 'sent', // وضعیت اولیه: ارسال شد
                timestamp: new Date().toISOString() // Store as ISO string
            };
            if (!data.messages[activeContactPhone]) data.messages[activeContactPhone] = [];
            data.messages[activeContactPhone].push(message);
            db.save(data);
            appendMessage(message);
            msgInput.value = '';

            // 2. شبیه‌سازی تحویل پیام (تیک دوم)
            setTimeout(() => {
                const currentData = db.get();
                const msgToUpdate = currentData.messages[activeContactPhone].find(m => m.id === message.id);
                if (msgToUpdate) {
                    msgToUpdate.status = 'delivered';
                    db.save(currentData);
                    renderEverything(); // رندر مجدد برای نمایش تیک دوم
                }
            }, 1000 + Math.random() * 500); // Shorter delay for delivered

            // 3. شبیه‌سازی پاسخ از طرف مخاطب (AI-like response)
            setTimeout(() => {
                const replyText = generateAIResponse(text); // Generate AI response
                const replyMessage = {
                    id: Date.now() + 1, // Unique ID for reply
                    type: 'received',
                    text: replyText,
                    status: 'sent', // For received messages, status typically remains 'sent' until marked read by user
                    timestamp: new Date().toISOString()
                };
                // Ensure data is fresh before pushing reply
                const updatedData = db.get();
                if (!updatedData.messages[activeContactPhone]) updatedData.messages[activeContactPhone] = [];
                updatedData.messages[activeContactPhone].push(replyMessage);
                db.save(updatedData);
                renderEverything(); // Re-render to show the reply
            }, 2000 + Math.random() * 1500); // Slightly longer delay for reply
        });

        // --- Settings Modal Event Listeners ---
        settingsBtn.addEventListener('click', () => {
            // Fill current user data into settings fields when modal opens
            settingNameInput.value = data.currentUser.name;
            settingPhoneInput.value = data.currentUser.phone;
            settingUserIdInput.value = data.currentUser.userId;
            settingProfilePicInput.value = ''; // Clear file input on open

            settingsModal.style.display = 'flex'; // Show modal
        });

        closeButton.addEventListener('click', () => {
            settingsModal.style.display = 'none'; // Hide modal
        });

        // Close the modal if the user clicks outside of the modal content
        window.addEventListener('click', (event) => {
            if (event.target == settingsModal) {
                settingsModal.style.display = 'none';
            }
        });

        // Save settings button click handler
        settingsForm.addEventListener('submit', (e) => {
            e.preventDefault(); // Prevent form submission and page reload

            const newName = settingNameInput.value.trim();
            const newPhone = settingPhoneInput.value.trim();
            const newUserId = settingUserIdInput.value.trim();
            const newProfilePicFile = settingProfilePicInput.files[0];

            const phoneRegex = /^09[0-9]{9}$/;
            if (!newName || !newPhone || !newUserId || !phoneRegex.test(newPhone)) {
                alert("لطفاً تمامی فیلدها را با اطلاعات معتبر پر کنید (شماره تلفن مثال: 09123456789).");
                return;
            }

            // Update current user data
            data.currentUser.name = newName;
            data.currentUser.phone = newPhone;
            data.currentUser.userId = newUserId;

            if (newProfilePicFile) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    data.currentUser.profilePic = event.target.result;
                    db.save(data);
                    alert("تغییرات با موفقیت ذخیره شد!");
                    settingsModal.style.display = 'none'; // Hide modal after saving
                    renderEverything(); // Re-render chat page to reflect new user info
                };
                reader.readAsDataURL(newProfilePicFile);
            } else {
                // If no new file is chosen, keep the existing pic or use default if none was set
                // data.currentUser.profilePic remains what it was or defaults to DEFAULT_AVATAR_URL on first load.
                db.save(data);
                alert("تغییرات با موفقیت ذخیره شد!");
                settingsModal.style.display = 'none'; // Hide modal after saving
                renderEverything(); // Re-render chat page to reflect new user info
            }
        });


        logoutBtn.addEventListener('click', () => {
             if(confirm("آیا میخواهید از حساب خود خارج شوید؟")) {
                 localStorage.removeItem('chatAppLocalDB_v2');
                 window.location.href = 'index.html';
             }
        });


        // اولین اجرای برنامه
        renderEverything();
    }
});