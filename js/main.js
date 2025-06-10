document.addEventListener('DOMContentLoaded', () => {

    // عکس پروفایل پیش‌فرض - از یک URL معتبر استفاده شده است
    const DEFAULT_AVATAR_URL = 'https://dbkhatam.ir/images/person_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24.svg';

    // شبیه‌سازی پایگاه داده در localStorage
    const db = {
        get: () => JSON.parse(localStorage.getItem('chatAppLocalDB_v2')) || { currentUser: null, contacts: [], messages: {} },
        save: (data) => localStorage.setItem('chatAppLocalDB_v2', JSON.stringify(data)),
    };

    // تشخیص صفحه (لاگین یا چت)
    if (document.querySelector('.login-container')) {
        handleLoginPage();
    } else if (document.querySelector('.chat-container')) {
        handleChatPage();
    }

    // --- مدیریت صفحه لاگین ---
    function handleLoginPage() {
        const loginForm = document.getElementById('loginForm');
        const profilePicInput = document.getElementById('profilePic');

        // اگر کاربر قبلاً لاگین کرده باشد، مستقیم به صفحه چت می‌رود
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
            data.currentUser = { name, phone, userId, profilePic: DEFAULT_AVATAR_URL }; // ابتدا با آواتار پیش‌فرض مقداردهی می‌شود

            if (profilePicFile) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    data.currentUser.profilePic = event.target.result; // عکس انتخابی جایگزین می‌شود
                    db.save(data);
                    window.location.href = 'chat.html';
                };
                reader.readAsDataURL(profilePicFile);
            } else {
                db.save(data); // اگر عکسی انتخاب نشد، فقط نام و شماره را ذخیره می‌کند
                window.location.href = 'chat.html';
            }
        });
    }

    // --- مدیریت صفحه چت ---
    function handleChatPage() {
        let data = db.get(); // دریافت آخرین وضعیت دیتابیس
        let activeContactPhone = null; // شماره تلفن مخاطب فعال
        let contextMenuContactPhone = null; // شماره تلفن مخاطب برای منوی راست کلیک

        // اگر کاربری لاگین نکرده باشد، به صفحه لاگین هدایت می‌شود
        if (!data.currentUser) {
            window.location.href = 'index.html';
            return;
        }

        // انتخاب عناصر DOM
        const chatContainer = document.querySelector('.chat-container');
        const sidebar = document.querySelector('.sidebar');
        const chatWindow = document.querySelector('.chat-window');
        const welcomeScreen = document.getElementById('welcomeScreen');
        const chatScreen = document.getElementById('chatScreen');
        const contactListEl = document.getElementById('contactList');
        const messagesEl = document.getElementById('messages');
        const chatForm = document.getElementById('chatForm');
        const msgInput = document.getElementById('msg');
        const fileInput = document.getElementById('fileInput');
        const captionInput = document.getElementById('captionInput');
        const contextMenu = document.getElementById('contextMenu');
        const settingsBtn = document.getElementById('settingsBtn');
        const settingsModal = document.getElementById('settingsModal');
        const closeButton = settingsModal.querySelector('.close-button');
        const logoutBtn = document.getElementById('logoutBtn');
        const backToContactsBtn = document.getElementById('backToContactsBtn');
        const settingsForm = document.getElementById('settingsForm'); // اضافه شده برای فرم تنظیمات
        const settingNameInput = document.getElementById('settingName'); // اضافه شده
        const settingPhoneInput = document.getElementById('settingPhone'); // اضافه شده
        const settingUserIdInput = document.getElementById('settingUserId'); // اضافه شده
        const settingProfilePicInput = document.getElementById('settingProfilePic'); // اضافه شده

        // NEW: اطمینان از اینکه مودال تنظیمات هنگام بارگذاری صفحه پنهان است
        settingsModal.style.display = 'none';

        // --- منطق منوی راست کلیک ---
        function showContextMenu(e) {
            e.preventDefault(); // جلوگیری از منوی راست کلیک پیش‌فرض مرورگر
            contextMenuContactPhone = e.currentTarget.dataset.phone;
            contextMenu.style.display = 'block';
            // موقعیت منو را تنظیم می‌کند تا در کنار اشاره‌گر موس نمایش داده شود
            // از right استفاده شده چون rtl هستیم
            contextMenu.style.top = `${e.pageY}px`;
            contextMenu.style.right = `${window.innerWidth - e.pageX}px`;
        }

        function hideContextMenu() {
            contextMenu.style.display = 'none';
            contextMenuContactPhone = null;
        }
        window.addEventListener('click', hideContextMenu); // کلیک در هر جای صفحه منو را می‌بندد

        // رویدادهای مربوط به آیتم‌های منوی راست کلیک
        document.getElementById('menu-rename').addEventListener('click', () => {
            const contact = data.contacts.find(c => c.phone === contextMenuContactPhone);
            if (!contact) return;
            const newName = prompt("نام جدید را وارد کنید:", contact.name);
            if (newName && newName.trim()) {
                contact.name = newName.trim();
                db.save(data);
                renderEverything(); // رندر مجدد برای نمایش تغییرات
            }
        });

        document.getElementById('menu-change-contact-pic').addEventListener('click', () => {
            const contact = data.contacts.find(c => c.phone === contextMenuContactPhone);
            if (!contact) return;

            const tempFileInput = document.createElement('input');
            tempFileInput.type = 'file';
            tempFileInput.accept = 'image/*';
            tempFileInput.style.display = 'none'; // مخفی کردن ورودی فایل

            tempFileInput.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(event) {
                        contact.profilePic = event.target.result;
                        db.save(data);
                        renderEverything(); // رندر مجدد برای نمایش تغییرات
                    };
                    reader.readAsDataURL(file);
                }
            };
            tempFileInput.click(); // شبیه‌سازی کلیک روی ورودی فایل
        });

        document.getElementById('menu-delete-messages').addEventListener('click', () => {
            if (confirm(`آیا از حذف تمام پیام‌های این مخاطب مطمئن هستید؟`)) {
                data.messages[contextMenuContactPhone] = []; // حذف پیام‌ها
                db.save(data);
                if (activeContactPhone === contextMenuContactPhone) {
                    renderMessages(activeContactPhone); // اگر این مخاطب فعال است، پیام‌ها را رندر کن
                }
            }
        });

        document.getElementById('menu-mark-read').addEventListener('click', () => {
             // این تابع در حال حاضر فقط یک پیام نمایش می‌دهد، می‌توانید منطق واقعی را اضافه کنید
             alert("پیام‌ها خوانده شده در نظر گرفته شدند.");
             // برای اعمال تغییرات واقعی:
             // const chatHistory = data.messages[contextMenuContactPhone] || [];
             // chatHistory.forEach(msg => {
             //     if (msg.type === 'received') msg.status = 'read';
             // });
             // db.save(data);
             // renderEverything();
        });

        document.getElementById('menu-delete-contact').addEventListener('click', () => {
            if (confirm(`آیا از حذف این مخاطب مطمئن هستید؟`)) {
                data.contacts = data.contacts.filter(c => c.phone !== contextMenuContactPhone); // حذف مخاطب
                delete data.messages[contextMenuContactPhone]; // حذف تاریخچه چت مخاطب
                db.save(data);
                if (activeContactPhone === contextMenuContactPhone) {
                    activeContactPhone = null; // اگر مخاطب حذف شده، چت فعال را پاک کن
                }
                renderEverything(); // رندر مجدد برای نمایش تغییرات
            }
        });

        // --- منطق رندر کردن UI ---
        function renderContacts() {
            contactListEl.innerHTML = ''; // پاک کردن لیست مخاطبین فعلی
            data.contacts.forEach(contact => {
                const contactDiv = document.createElement('div');
                contactDiv.className = 'contact-item';
                contactDiv.dataset.phone = contact.phone;
                if (contact.phone === activeContactPhone) contactDiv.classList.add('active'); // هایلایت کردن مخاطب فعال

                contactDiv.innerHTML = `<img src="${contact.profilePic || DEFAULT_AVATAR_URL}" alt="${contact.name}">
                    <div class="contact-info"><h5>${contact.name}</h5><small>${contact.phone}</small></div>`;

                contactDiv.addEventListener('click', () => {
                    activeContactPhone = contact.phone;
                    // پیام‌های دریافتی را به عنوان خوانده شده علامت‌گذاری می‌کند
                    const chatHistory = data.messages[activeContactPhone] || [];
                    chatHistory.forEach(msg => {
                        if (msg.type === 'received') msg.status = 'read';
                    });
                    db.save(data);
                    renderEverything(); // رندر مجدد کل UI برای نمایش چت فعال

                    // برای حالت موبایل: مخفی کردن سایدبار و نمایش پنجره چت
                    if (window.innerWidth <= 768) {
                        sidebar.classList.add('hidden');
                        chatWindow.classList.add('active');
                    }
                });

                contactDiv.addEventListener('contextmenu', showContextMenu); // افزودن رویداد راست کلیک
                contactListEl.appendChild(contactDiv);
            });
        }

        function renderMessages(phone) {
            messagesEl.innerHTML = ''; // پاک کردن پیام‌های فعلی
            const chatHistory = data.messages[phone] || [];
            chatHistory.forEach(appendMessage); // اضافه کردن تک تک پیام‌ها
            messagesEl.scrollTop = messagesEl.scrollHeight; // اسکرول به پایین
        }

        function appendMessage(msg) {
            const messageDiv = document.createElement('div');
            messageDiv.classList.add('message', msg.type); // اضافه کردن کلاس sent یا received

            let contentHTML = '';
            if (msg.fileContent) { // اگر پیام شامل فایل است
                contentHTML = `<img src="${msg.fileContent}" alt="Sent image" />`;
                if (msg.caption) {
                    contentHTML += `<span class="caption">${msg.caption}</span>`;
                }
            } else { // اگر پیام فقط متن است
                contentHTML = msg.text;
            }

            let ticksHTML = '';
            if (msg.type === 'sent') { // فقط برای پیام‌های ارسالی تیک نمایش داده می‌شود
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
            messagesEl.scrollTop = messagesEl.scrollHeight; // اسکرول به پایین بعد از هر پیام
        }

        // تابع اصلی رندرینگ که کل UI را به‌روز می‌کند
        function renderEverything() {
            data = db.get(); // همیشه آخرین داده‌ها را برای رندر دریافت می‌کند
            if (activeContactPhone) {
                const contact = data.contacts.find(c => c.phone === activeContactPhone);
                // اگر مخاطب فعال حذف شده باشد، activeContactPhone را null می‌کند
                if (!contact) {
                    activeContactPhone = null;
                    renderEverything(); // فراخوانی مجدد برای نمایش صفحه خوش‌آمدگویی
                    return;
                }

                welcomeScreen.style.display = 'none';
                chatScreen.style.display = 'flex'; // نمایش صفحه چت
                // NEW: بروزرسانی اطلاعات مخاطب در هدر چت
                document.getElementById('chattingWith').textContent = contact.name;
                document.getElementById('contactProfilePic').src = contact.profilePic || DEFAULT_AVATAR_URL;
                renderMessages(activeContactPhone); // رندر پیام‌های مخاطب فعال
            } else {
                chatScreen.style.display = 'none'; // پنهان کردن صفحه چت
                welcomeScreen.style.display = 'flex'; // نمایش صفحه خوش‌آمدگویی
                // برای حالت موبایل: اگر چت فعال نیست، سایدبار را نمایش بده
                if (window.innerWidth <= 768) {
                     sidebar.classList.remove('hidden');
                     chatWindow.classList.remove('active');
                }
            }
            renderContacts(); // رندر لیست مخاطبین
            // بروزرسانی اطلاعات کاربر فعلی در سایدبار
            document.getElementById('currentUserName').textContent = data.currentUser.name;
            document.getElementById('currentUserProfilePic').src = data.currentUser.profilePic || DEFAULT_AVATAR_URL;
        }

        // --- منطق پاسخ هوش مصنوعی ---
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
            } else if (lowerCaseMsg.includes('چرا جواب نمیدی؟')) {
                return 'چته خب. دارم جواب میدم دیگه!'
            } else if (lowerCaseMsg.includes('آی قلبم. وای قلبم. آی قلبم. واییی قلبم')) {
                return 'قلبت چشه؟ اصلا به من چه!'
            } else if (lowerCaseMsg.includes('بی ادب')) {
                return 'خودت بی ادبی بی ...'
            }
            return 'متاسفانه پیام شما را متوجه نشدم. لطفا واضح‌تر بگویید.';
        }


        // --- رویدادهای اصلی ---

        // افزودن مخاطب جدید
        document.getElementById('addContactBtn').addEventListener('click', () => {
            const name = prompt("نام مخاطب:");
            const phone = prompt("شماره تلفن مخاطب (مثال: 09123456789):");
            const phoneRegex = /^09[0-9]{9}$/;
            if (name && phone && phoneRegex.test(phone)) {
                if (data.contacts.some(c => c.phone === phone)) {
                    alert("مخاطبی با این شماره تلفن از قبل وجود دارد.");
                    return;
                }
                data.contacts.push({ name, phone, profilePic: DEFAULT_AVATAR_URL });
                db.save(data);
                renderContacts(); // فقط لیست مخاطبین را رندر کن
            } else if (name || phone) {
                alert("لطفا نام و شماره تلفن معتبر (مثال: 09123456789) را وارد کنید.");
            }
        });

        // نمایش/پنهان کردن کادر کپشن برای فایل
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                captionInput.style.display = 'block';
            } else {
                captionInput.style.display = 'none';
                captionInput.value = '';
            }
        });

        // ارسال پیام یا فایل
        chatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const text = msgInput.value.trim();
            const caption = captionInput.value.trim();
            const file = fileInput.files[0];

            if (!activeContactPhone || (!text && !file)) return; // اگر مخاطبی انتخاب نشده یا پیام و فایلی نیست، ارسال نکن

            let fileContent = null;
            if (file) {
                fileContent = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (event) => resolve(event.target.result);
                    reader.readAsDataURL(file);
                });
            }

            const message = {
                id: Date.now(),
                type: 'sent',
                text: text,
                fileContent: fileContent,
                caption: caption,
                status: 'sent', // وضعیت اولیه
                timestamp: new Date().toISOString()
            };

            if (!data.messages[activeContactPhone]) data.messages[activeContactPhone] = [];
            data.messages[activeContactPhone].push(message);
            db.save(data);
            appendMessage(message); // بلافاصله پیام کاربر را نمایش بده

            // پاک کردن فیلدها
            msgInput.value = '';
            fileInput.value = '';
            captionInput.value = '';
            captionInput.style.display = 'none';

            // شبیه‌سازی تحویل پیام (مثال: تیک دوم)
            setTimeout(() => {
                const currentData = db.get(); // آخرین وضعیت دیتابیس را برای به‌روزرسانی بگیر
                const msgToUpdate = currentData.messages[activeContactPhone].find(m => m.id === message.id);
                if (msgToUpdate) {
                    msgToUpdate.status = 'delivered';
                    db.save(currentData);
                    renderEverything(); // رندر مجدد برای نمایش تیک دوم
                }
            }, 1000 + Math.random() * 500);

            // شبیه‌سازی پاسخ از طرف هوش مصنوعی
            setTimeout(() => {
                const aiMessageText = text || (file ? 'یک فایل ارسال شد' : ''); // اگر متنی نبود و فایل بود
                const replyText = generateAIResponse(aiMessageText); // فراخوانی تابع هوش مصنوعی
                const replyMessage = {
                    id: Date.now() + 1,
                    type: 'received',
                    text: replyText,
                    status: 'sent', // وضعیت پیام دریافتی (می‌توانید 'read' یا 'received' هم بگذارید)
                    timestamp: new Date().toISOString()
                };
                const updatedData = db.get(); // آخرین وضعیت دیتابیس را برای اضافه کردن پیام AI بگیر
                if (!updatedData.messages[activeContactPhone]) updatedData.messages[activeContactPhone] = [];
                updatedData.messages[activeContactPhone].push(replyMessage);
                db.save(updatedData);
                appendMessage(replyMessage); // بلافاصله پیام AI را نمایش بده
                // نیازی به renderEverything() نیست چون appendMessage اسکرول می‌کند.
            }, 2000 + Math.random() * 1500); // تاخیر تصادفی برای طبیعی‌تر شدن
        });

        // --- رویدادهای مودال تنظیمات ---
        settingsBtn.addEventListener('click', () => {
            // پر کردن فیلدهای فرم با اطلاعات فعلی کاربر
            settingNameInput.value = data.currentUser.name;
            settingPhoneInput.value = data.currentUser.phone;
            settingUserIdInput.value = data.currentUser.userId;
            settingProfilePicInput.value = ''; // خالی کردن فیلد انتخاب فایل برای هر بار باز شدن

            settingsModal.style.display = 'flex'; // نمایش مودال (به صورت فلکس برای مرکزیت)
        });

        closeButton.addEventListener('click', () => {
            settingsModal.style.display = 'none'; // مخفی کردن مودال
        });

        // بستن مودال با کلیک در خارج از آن
        window.addEventListener('click', (event) => {
            if (event.target == settingsModal) {
                settingsModal.style.display = 'none';
            }
        });

        // ذخیره تغییرات تنظیمات
        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const newName = settingNameInput.value.trim();
            const newPhone = settingPhoneInput.value.trim();
            const newUserId = settingUserIdInput.value.trim();
            const newProfilePicFile = settingProfilePicInput.files[0];

            const phoneRegex = /^09[0-9]{9}$/;
            if (!newName || !newPhone || !newUserId || !phoneRegex.test(newPhone)) {
                alert("لطفاً تمامی فیلدها را با اطلاعات معتبر پر کنید (شماره تلفن مثال: 09123456789).");
                return;
            }

            // به‌روزرسانی اطلاعات کاربر
            data.currentUser.name = newName;
            data.currentUser.phone = newPhone;
            data.currentUser.userId = newUserId;

            if (newProfilePicFile) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    data.currentUser.profilePic = event.target.result;
                    db.save(data);
                    alert("تغییرات با موفقیت ذخیره شد!");
                    settingsModal.style.display = 'none'; // مخفی کردن مودال
                    renderEverything(); // رندر مجدد صفحه برای نمایش اطلاعات جدید کاربر
                };
                reader.readAsDataURL(newProfilePicFile);
            } else {
                db.save(data);
                alert("تغییرات با موفقیت ذخیره شد!");
                settingsModal.style.display = 'none'; // مخفی کردن مودال
                renderEverything(); // رندر مجدد صفحه
            }
        });

        // خروج از حساب کاربری
        logoutBtn.addEventListener('click', () => {
             if(confirm("آیا میخواهید از حساب خود خارج شوید؟")) {
                 localStorage.removeItem('chatAppLocalDB_v2'); // پاک کردن داده‌ها از localStorage
                 window.location.href = 'index.html'; // برگشت به صفحه لاگین
             }
        });

        // دکمه بازگشت برای حالت موبایل (از صفحه چت به لیست مخاطبین)
        backToContactsBtn.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('hidden'); // نمایش سایدبار
                chatWindow.classList.remove('active'); // مخفی کردن پنجره چت
                activeContactPhone = null; // پاک کردن مخاطب فعال
                renderEverything(); // رندر مجدد (که باعث نمایش صفحه خوش‌آمدگویی می‌شود)
            }
        });

        // اولین اجرای برنامه هنگام بارگذاری صفحه
        renderEverything();
    }
});