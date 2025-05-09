console.log('app.js загружен');

// Функция для проверки аутентификации
function checkAuth() {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    if (role === 'doctor' && !window.location.pathname.endsWith('doctor.html')) {
        window.location.href = 'doctor.html';
    } else if (role === 'patient' && !window.location.pathname.endsWith('patient.html')) {
        window.location.href = 'patient.html';
    } else if (!role) {
        window.location.href = 'login.html';
    }
}
;
function loadAvailableTime(doctor, date) {
    if (!doctor || !date) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    fetch(`/api/available-time?doctor=${encodeURIComponent(doctor)}&date=${encodeURIComponent(date)}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) throw new Error('Ошибка загрузки времени');
        return response.json();
    })
    .then(data => {
        const timeSelect = document.getElementById('appointmentTime');
        const dateHelp = document.getElementById('dateHelp');
        
        timeSelect.innerHTML = '';
        
        if (data.availableTimeSlots.length === 0) {
            timeSelect.innerHTML = '<option value="" disabled selected>-- Нет доступного времени --</option>';
            if (dateHelp) {
                dateHelp.textContent = data.message || 'Врач не работает в этот день';
                dateHelp.style.color = '#ff4d4d';
            }
            return;
        }

        timeSelect.innerHTML = '<option value="" disabled selected>-- Выберите время --</option>';
        
        const now = new Date();
        const selectedDate = new Date(date);
        const isToday = selectedDate.toDateString() === now.toDateString();
        
        data.availableTimeSlots.forEach(time => {
            // Пропускаем прошедшие временные слоты
            if (isToday) {
                const [hours, minutes] = time.split(':').map(Number);
                const slotTime = new Date(selectedDate);
                slotTime.setHours(hours, minutes, 0, 0);
                
                if (slotTime <= now) {
                    return; // Пропускаем прошедшие временные слоты
                }
            }
            
            const option = document.createElement('option');
            option.value = time;
            option.textContent = time;
            timeSelect.appendChild(option);
        });

        // Проверяем, остались ли доступные слоты после фильтрации
        if (timeSelect.options.length <= 1) {
            timeSelect.innerHTML = '<option value="" disabled selected>-- Нет доступного времени --</option>';
            if (dateHelp) {
                dateHelp.textContent = isToday 
                    ? 'На сегодня все доступные временные слоты уже прошли' 
                    : 'Нет доступного времени';
                dateHelp.style.color = '#ff4d4d';
            }
        } else if (dateHelp) {
            const doctorSelect = document.getElementById('doctorSelect');
            const selectedDoctor = doctorSelect ? doctorSelect.value : '';
            
            let doctorInfo = '';
            if (selectedDoctor === 'Иванов И.И.') {
                doctorInfo = 'Доктор Иванов И.И. работает только по будням с 9:00 до 22:00';
            } else if (selectedDoctor === 'Быков А.Е.') {
                doctorInfo = 'Доктор Быков А.Е. работает только по выходным с 10:00 до 23:30';
            } else if (selectedDoctor === 'Петров В.В.') {
                doctorInfo = 'Доктор Петров В.В. работает только по будням с 8:00 до 20:00';
            } else {
                doctorInfo = `Доктор работает с ${data.workHours.start}:00 до ${data.workHours.end}:00`;
            }
            
            dateHelp.textContent = doctorInfo;
            dateHelp.style.color = '#666';
        }
    })
    .catch(err => {
        console.error('Ошибка загрузки времени:', err);
        const timeSelect = document.getElementById('appointmentTime');
        if (timeSelect) {
            timeSelect.innerHTML = '<option value="" disabled selected>-- Ошибка загрузки --</option>';
        }
    });
}
const doctors = [
    { id: 1, name: "Иванов И.И.", specialty: "Терапевт", experience: "10 лет", about: "Специалист по внутренним болезням." },
    { id: 2, name: "Петрова А.А.", specialty: "Кардиолог", experience: "8 лет", about: "Профилактика и лечение заболеваний сердца." },
    { id: 3, name: "Сидоров В.В.", specialty: "Невролог", experience: "12 лет", about: "Опытный специалист по неврологии." }
];

function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Неверные учетные данные');
        }
        return response.json();
    })
    .then(data => {
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', data.role);
        localStorage.setItem('username', data.username);
        localStorage.setItem('fullName', data.fullName); // Сохраняем полное имя
        
        if (data.role === 'doctor') {
            window.location.href = 'doctor.html';
        } else {
            window.location.href = 'patient.html';
        }
    })
    .catch(err => {
        const errorMessage = document.getElementById('error-message');
        errorMessage.textContent = err.message;
        errorMessage.style.display = 'block';
        setTimeout(() => errorMessage.style.display = 'none', 3000);
    });
}


let doctorsData = []; 

function loadDoctors() {
    const token = localStorage.getItem('token');
    if (!token) return;

    fetch('/api/doctors', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) throw new Error('Ошибка загрузки врачей');
        return response.json();
    })
    .then(doctors => {
        doctorsData = doctors;
        const select = document.getElementById('doctorSelect');
        if (!select) return;
        
        // Очищаем и добавляем заголовок
        select.innerHTML = '<option value="" disabled selected>-- Выберите врача --</option>';
        
        // Добавляем всех врачей в список
        doctors.forEach(doctor => {
            const option = document.createElement('option');
            option.value = doctor.username;
            option.textContent = `${doctor.name} (${doctor.specialization})`;
            select.appendChild(option);
        });

        // Добавляем обработчик изменения выбора врача
        select.addEventListener('change', function() {
            const selectedDoctor = doctorsData.find(d => d.username === this.value);
            if (selectedDoctor) {
                displayDoctorInfo(this.value);
            }
        });
    })
    .catch(err => {
        console.error('Ошибка загрузки врачей:', err);
        const select = document.getElementById('doctorSelect');
        if (select) {
            select.innerHTML = '<option value="" disabled selected>-- Ошибка загрузки --</option>';
        }
    });
}

function displayDoctorInfo(doctorUsername) {
    const infoDiv = document.getElementById("doctorInfo");
    if (!infoDiv) return;

    const doctor = doctorsData.find(d => d.username === doctorUsername);
    if (!doctor) {
        infoDiv.innerHTML = "";
        return;
    }

    // Форматируем рабочие дни
    const daysMap = {
        0: "Воскресенье",
        1: "Понедельник",
        2: "Вторник",
        3: "Среда",
        4: "Четверг",
        5: "Пятница",
        6: "Суббота"
    };
    
    const workDays = doctor.workDays && doctor.workDays.length > 0 
        ? doctor.workDays.map(day => daysMap[day]).join(', ')
        : 'Не указаны';
    
    const workHours = doctor.workHours 
        ? `${Math.floor(doctor.workHours.start)}:00 - ${Math.floor(doctor.workHours.end)}:${(doctor.workHours.end % 1) ? '30' : '00'}`
        : 'Круглосуточно';

    infoDiv.innerHTML = `
        <div class="doctor-info-card">
            <h3>${doctor.name}</h3>
            <p><strong>Специализация:</strong> ${doctor.specialization}</p>
            <p><strong>Опыт работы:</strong> ${doctor.experience}</p>
            <p><strong>О себе:</strong> ${doctor.about}</p>
            <p><strong>Рабочие дни:</strong> ${workDays}</p>
            <p><strong>Часы работы:</strong> ${workHours}</p>
        </div>
    `;
}

window.onload = loadDoctors;

function displayDoctorInfo(doctorUsername) {
    const infoDiv = document.getElementById("doctorInfo");
    if (!infoDiv) return;

    const doctor = doctorsData.find(d => d.username === doctorUsername);
    if (!doctor) {
        infoDiv.innerHTML = "";
        return;
    }

    // Форматируем рабочие дни
    const daysMap = {
        0: "Воскресенье",
        1: "Понедельник",
        2: "Вторник",
        3: "Среда",
        4: "Четверг",
        5: "Пятница",
        6: "Суббота"
    };
    
    const workDays = doctor.workDays.map(day => daysMap[day]).join(', ');
    const workHours = doctor.workHours 
        ? `${Math.floor(doctor.workHours.start)}:00 - ${Math.floor(doctor.workHours.end)}:${(doctor.workHours.end % 1) ? '30' : '00'}`
        : 'Круглосуточно';

    infoDiv.innerHTML = `
        <h3>${doctor.name}</h3>
        <p><strong>Специализация:</strong> ${doctor.specialization}</p>
        <p><strong>Опыт работы:</strong> ${doctor.experience}</p>
        <p><strong>О себе:</strong> ${doctor.about}</p>
        <p><strong>Рабочие дни:</strong> ${workDays}</p>
        <p><strong>Часы работы:</strong> ${workHours}</p>
    `;
}


function loadDoctorProfile(username) {
    const doctor = doctors.find(d => d.name.includes(username));
    if (doctor) {
        const profileDiv = document.getElementById("doctorProfile");
        profileDiv.innerHTML = `
            <h3>Профиль</h3>
            <p><strong>Специальность:</strong> ${doctor.specialty}</p>
            <p><strong>Опыт работы:</strong> ${doctor.experience}</p>
            <p><strong>О себе:</strong> ${doctor.about}</p>
        `;
    }
}

let users = [];

function loadConsultations() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    fetch('/api/users')
    .then(res => res.json())
    .then(userData => {
        users = userData;

        return fetch('/api/consultations', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
    })
    .then(response => {
        if (!response.ok) throw new Error('Ошибка загрузки консультаций');
        return response.json();
    })
    .then(data => {
        const upcomingList = document.getElementById('upcomingConsultations');
        const historyList = document.getElementById('consultationHistory');
        
        if (upcomingList) upcomingList.innerHTML = '';
        if (historyList) historyList.innerHTML = '';

        const now = new Date();
        const role = localStorage.getItem('role');
        const username = localStorage.getItem('username');

        // Обогащаем консультации именами врачей
        const consultationsWithNames = data.map(c => {
            const doctor = users.find(u => u.username === c.doctor);
            return {
                ...c,
                doctorDisplayName: doctor ? doctor.fullName : c.doctor
            };
        });

        // Разделяем консультации:
        const upcoming = consultationsWithNames.filter(c => 
            c.status === 'upcoming' && 
            new Date(`${c.date}T${c.time}`) > now
        );

        const history = consultationsWithNames.filter(c => 
            c.status === 'completed' || 
            c.status === 'canceled' || 
            (c.status === 'upcoming' && new Date(`${c.date}T${c.time}`) <= now)
        );

        if (upcomingList) {
            if (upcoming.length === 0) {
                upcomingList.innerHTML = '<p class="no-consultations">Нет предстоящих консультаций</p>';
            } else {
                upcoming.forEach(consultation => {
                    upcomingList.appendChild(createConsultationCard(consultation, true));
                });
            }
        }

        if (historyList) {
            if (history.length === 0) {
                historyList.innerHTML = '<p class="no-consultations">История консультаций пуста</p>';
            } else {
                history.forEach(consultation => {
                    historyList.appendChild(createConsultationCard(consultation, false));
                });
            }
        }
    })
    .catch(err => {
        console.error('Ошибка при загрузке консультаций:', err);
        alert('Не удалось загрузить консультации. Пожалуйста, попробуйте позже.');
    });
}



function showDischargeForm(consultationId) {
    const form = document.getElementById(`dischargeForm-${consultationId}`);
    if (form) {
        form.style.display = 'block'; // показываем форму для выписки
    }
}


function submitDischarge(consultationId) {
    const textArea = document.getElementById(`dischargeText-${consultationId}`);
    const dischargeText = textArea ? textArea.value.trim() : '';

    if (!dischargeText) {
        alert('Пожалуйста, заполните выписку.');
        return;
    }

    if (!confirm('Вы уверены, что хотите завершить консультацию и отправить выписку?')) {
        return;
    }

    const token = localStorage.getItem('token');

    fetch(`/api/consultations/${consultationId}/complete`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ dischargeText })  // Отправляем текст выписки
    })
    .then(response => {
        if (!response.ok) return response.json().then(err => { throw new Error(err.error); });
        return response.json();
    })
    .then(() => {
        loadConsultations(); // перезагружаем список консультаций
        showAlert('Консультация успешно завершена и выписка отправлена!', 'success');
    })
    .catch(err => {
        console.error('Ошибка при завершении консультации:', err);
        showAlert(err.message || 'Ошибка завершения консультации', 'error');
    });
}



function getStatusText(status) {
    const statusTexts = {
        'upcoming': 'Предстоящая',
        'completed': 'Завершена',
        'canceled': 'Отменена',
        'missed': 'Пропущена' // Добавляем новый статус
    };
    return statusTexts[status] || status;
}

function formatDate(dateString) {
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString('ru-RU', options);
}
function cancelConsultation(id) {
    if (!confirm('Вы уверены, что хотите отменить консультацию?')) return;
    
    const token = localStorage.getItem('token');
    fetch(`/api/consultations/${id}/cancel`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) return response.json().then(err => { throw new Error(err.error); });
        return response.json();
    })
    .then(() => {
        loadConsultations();
        showAlert('Консультация отменена', 'success');
    })
    .catch(err => {
        console.error('Ошибка при отмене консультации:', err);
        showAlert(err.message, 'error');
    });
}

function completeConsultation(id) {
    if (!confirm('Завершить консультацию?')) return;
    
    const token = localStorage.getItem('token');
    fetch(`/api/consultations/${id}/complete`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) return response.json().then(err => { throw new Error(err.error); });
        return response.json();
    })
    .then(() => {
        loadConsultations();
        showAlert('Консультация завершена', 'success');
    })
    .catch(err => {
        console.error('Ошибка при завершении консультации:', err);
        showAlert(err.message, 'error');
    });
}

// Запись на консультацию
function bookAppointment(event) {
    event.preventDefault();
    
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const doctorSelect = document.getElementById('doctorSelect');
    const dateInput = document.getElementById('appointmentDate');
    const timeSelect = document.getElementById('appointmentTime');
    
    const doctor = doctorSelect ? doctorSelect.value : '';
    const date = dateInput ? dateInput.value : '';
    const time = timeSelect ? timeSelect.value : '';
    const patientName = localStorage.getItem('username');

    // Валидация
    if (!doctor) {
        showAlert('Пожалуйста, выберите врача', 'error');
        return;
    }

    if (!date || !time) {
        showAlert('Пожалуйста, укажите дату и время', 'error');
        return;
    }

    fetch('/api/consultations', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            doctor,
            date,
            time,
            patientName
        })
    })
    .then(response => {
        if (!response.ok) return response.json().then(err => { throw new Error(err.error); });
        return response.json();
    })
    .then(() => {
        showAlert('Вы успешно записались на консультацию!', 'success');
        const form = document.getElementById('appointmentForm');
        if (form) form.reset();
        loadConsultations();
    })
    .catch(err => {
        console.error('Ошибка при записи на консультацию:', err);
        showAlert(err.message, 'error');
    });
}

function showAlert(message, type) {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    document.body.appendChild(alert);
    
    setTimeout(() => {
        alert.classList.add('fade-out');
        setTimeout(() => alert.remove(), 300);
    }, 3000);
}

function loadUserInfo() {
    const username = localStorage.getItem('username');
    const fullName = localStorage.getItem('fullName'); // Добавляем получение полного имени
    const usernameDisplay = document.getElementById('usernameDisplay');
    
    if (usernameDisplay) {
        // Отображаем полное имя, если оно есть, иначе - логин
        usernameDisplay.textContent = fullName || username || "Гость";
    }
}
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    window.location.href = 'login.html';
}
function registerUser(event) {
    event.preventDefault();
    
    const fullName = document.getElementById('fullName').value;
    const username = document.getElementById('newUsername').value;
    const password = document.getElementById('newPassword').value;

    // Проверка пароля
    const isValidPassword = password.length >= 8 && /[A-Za-z]/.test(password);
    if (!isValidPassword) {
        showAlert('Пароль должен содержать не менее 8 символов и хотя бы одну букву.', 'error');
        return;
    }

    fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, username, password })
    })
    .then(response => {
        if (!response.ok) return response.json().then(err => { throw new Error(err.error); });
        return response.json();
    })
    .then(data => {
        showAlert(data.message, 'success');
        if (data.message.includes('успешна')) {
            setTimeout(() => window.location.href = 'login.html', 2000);
        }
    })
    .catch(err => {
        console.error('Ошибка регистрации:', err);
        showAlert(err.message, 'error');
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadUserInfo();
    
    if (document.getElementById('upcomingConsultations') || 
        document.getElementById('consultationHistory')) {
        loadConsultations();
    }
    
    if (document.getElementById('doctorSelect')) {
        loadDoctors();
    }
    
    const doctorSelect = document.getElementById('doctorSelect');
    const dateInput = document.getElementById('appointmentDate');
    
    if (doctorSelect && dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.min = today;
        
        doctorSelect.addEventListener('change', function() {
            if (dateInput.value) {
                loadAvailableTime(this.value, dateInput.value);
            }
        });
        
        dateInput.addEventListener('change', function() {
            if (doctorSelect.value) {
                loadAvailableTime(doctorSelect.value, this.value);
            }
        });
    }
    
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            login();
        });
    }
    
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            registerUser(e);
        });
    }
});

const style = document.createElement('style');
style.textContent = `
.alert {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 5px;
    color: white;
    z-index: 1000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    animation: slide-in 0.3s ease-out;
    max-width: 300px;
}
.alert-success {
    background-color: #4CAF50;
}
.alert-error {
    background-color: #f44336;
}
.fade-out {
    animation: fade-out 0.3s ease-out forwards;
}
@keyframes slide-in {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}
@keyframes fade-out {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
}
`;
document.head.appendChild(style);
function loadAvailableTime(doctor, date) {
    if (!doctor || !date) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    fetch(`/api/available-time?doctor=${encodeURIComponent(doctor)}&date=${encodeURIComponent(date)}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) throw new Error('Ошибка загрузки времени');
        return response.json();
    })
    .then(data => {
        const timeSelect = document.getElementById('appointmentTime');
        const dateHelp = document.getElementById('dateHelp');
        
        timeSelect.innerHTML = '';
        
        if (data.availableTimeSlots.length === 0) {
            timeSelect.innerHTML = '<option value="" disabled selected>-- Нет доступного времени --</option>';
            if (dateHelp) {
                dateHelp.textContent = data.message || 'Врач не работает в этот день';
                dateHelp.style.color = '#ff4d4d';
            }
            return;
        }

        timeSelect.innerHTML = '<option value="" disabled selected>-- Выберите время --</option>';
        
        const now = new Date();
        const selectedDate = new Date(date);
        const isToday = selectedDate.toDateString() === now.toDateString();
        
        data.availableTimeSlots.forEach(time => {
            // Пропускаем прошедшие временные слоты
            if (isToday) {
                const [hours, minutes] = time.split(':').map(Number);
                const slotTime = new Date(selectedDate);
                slotTime.setHours(hours, minutes, 0, 0);
                
                if (slotTime <= now) {
                    return; // Пропускаем прошедшие временные слоты
                }
            }
            
            const option = document.createElement('option');
            option.value = time;
            option.textContent = time;
            timeSelect.appendChild(option);
        });

        // Проверяем, остались ли доступные слоты после фильтрации
        if (timeSelect.options.length <= 1) {
            timeSelect.innerHTML = '<option value="" disabled selected>-- Нет доступного времени --</option>';
            if (dateHelp) {
                dateHelp.textContent = isToday 
                    ? 'На сегодня все доступные временные слоты уже прошли' 
                    : 'Нет доступного времени';
                dateHelp.style.color = '#ff4d4d';
            }
        } else if (dateHelp) {
            const doctorSelect = document.getElementById('doctorSelect');
            const selectedDoctor = doctorSelect ? doctorSelect.value : '';
            
            let doctorInfo = '';
            if (selectedDoctor === 'Иванов И.И.') {
                doctorInfo = 'Доктор Иванов И.И. работает только по будням с 9:00 до 22:00';
            } else if (selectedDoctor === 'Быков А.Е.') {
                doctorInfo = 'Доктор Быков А.Е. работает только по выходным с 10:00 до 23:30';
            } else if (selectedDoctor === 'Петров В.В.') {
                doctorInfo = 'Доктор Петров В.В. работает только по будням с 8:00 до 20:00';
            } else {
                doctorInfo = `Доктор работает с ${data.workHours.start}:00 до ${data.workHours.end}:00`;
            }
            
            dateHelp.textContent = doctorInfo;
            dateHelp.style.color = '#666';
        }
    })
    .catch(err => {
        console.error('Ошибка загрузки времени:', err);
        const timeSelect = document.getElementById('appointmentTime');
        if (timeSelect) {
            timeSelect.innerHTML = '<option value="" disabled selected>-- Ошибка загрузки --</option>';
        }
    });
}




function toggleDischarge(element) {
    const content = element.nextElementSibling;
    const toggleIcon = element.querySelector('.discharge-toggle');
    
    if (content.style.display === 'none' || !content.style.display) {
        content.style.display = 'block';
        toggleIcon.textContent = '👁️'; // Иконка открытого глаза
    } else {
        content.style.display = 'none';
        toggleIcon.textContent = '👁️'; // Иконка закрытого глаза
    }
}

// Создание карточки консультации
function createConsultationCard(consultation, isUpcoming) {
    const now = new Date();
    const consultationTime = new Date(`${consultation.date}T${consultation.time}`);
    const isMissed = consultation.status === 'upcoming' && consultationTime <= now;
    
    if (isMissed) consultation.status = 'missed';

    const card = document.createElement('div');
    card.classList.add('consultation-card');
    card.id = `consultationCard-${consultation.id}`;

    if (consultation.status === 'canceled') card.classList.add('canceled');
    else if (consultation.status === 'completed') card.classList.add('completed');
    else if (consultation.status === 'missed') card.classList.add('missed');

    const role = localStorage.getItem('role');
    const otherPerson = role === 'doctor' 
        ? consultation.patientDisplayName 
        : consultation.doctorDisplayName;

    const statusText = getStatusText(consultation.status);

    card.innerHTML = `
        <div class="consultation-header">
            <h4>${role === 'doctor' ? 'Пациент' : 'Врач'}: ${otherPerson}</h4>
            <span class="consultation-status" data-status="${consultation.status}">${statusText}</span>
        </div>
        <p class="consultation-date">${formatDate(consultation.date)}</p>
        <p class="consultation-time">${consultation.time}</p>

        ${isUpcoming && consultation.status === 'upcoming' 
            ? `<a href="${consultation.meetLink}" target="_blank" class="meet-link">Присоединиться</a>` 
            : ''}

        <div class="consultation-actions">
            ${isUpcoming && consultation.status === 'upcoming'
                ? (role === 'doctor' 
                    ? `<button onclick="cancelConsultation('${consultation.id}')" class="cancel-btn">Отменить</button>
                       <button onclick="showDischargeForm('${consultation.id}')" class="complete-btn">Завершить</button>`
                    : `<button onclick="cancelConsultation('${consultation.id}')" class="cancel-btn">Отменить</button>`)
                : ''}
        </div>

        ${consultation.status === 'completed' && consultation.dischargeText
            ? `<div class="discharge-info">
                  <div class="discharge-header" onclick="toggleDischarge(this)">
                      <span>Выписка:</span>
                      <span class="discharge-toggle">👁️</span>
                  </div>
                  <div class="discharge-content" style="display: none;">
                      <p>${consultation.dischargeText}</p>
                  </div>
              </div>`
            : ''}
    `;


    if (isUpcoming && consultation.status === 'upcoming' && role === 'doctor') {
        const historyDiv = card.querySelector(`#discharge-history-${consultation.id}`);
        
        if (historyDiv) {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams({
                doctor: consultation.doctor,
                patientName: consultation.patientName
            });

            fetch(`/discharge-history?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(res => res.json())
            .then(dischargeNotes => {
                if (dischargeNotes.length === 0) {
                    historyDiv.innerHTML = '<em>Нет предыдущих выписок</em>';
                } else {
                    const list = document.createElement('ul');
                    list.classList.add('discharge-history-list');

                    const historyDetails = document.createElement('details');
                    const historySummary = document.createElement('summary');
                    historySummary.innerHTML = '<strong>История выписок:</strong>';
                    historySummary.classList.add('spoiler-summary');
                    historyDetails.appendChild(historySummary);

                    dischargeNotes.forEach(note => {
                        const item = document.createElement('li');
                        item.classList.add('discharge-history-item');
                        
                        const details = document.createElement('details');
                        const summary = document.createElement('summary');
                        summary.innerHTML = `<strong>${note.date} ${note.time}</strong>`;
                        summary.classList.add('note-summary');
                        
                        const noteText = document.createElement('div');
                        noteText.innerHTML = note.note;
                        noteText.classList.add('note-text');

                        details.appendChild(summary);
                        details.appendChild(noteText);
                        item.appendChild(details);
                        list.appendChild(item);
                    });

                    historyDetails.appendChild(list);
                    historyDiv.innerHTML = '';
                    historyDiv.appendChild(historyDetails);
                }
            })
            .catch(err => {
                historyDiv.innerHTML = '<em>Ошибка загрузки выписок</em>';
                console.error(err);
            });
        }
    }

    return card;
}


function showNoteForm(consultationId) {
    const form = document.getElementById(`noteForm-${consultationId}`);
    if (form) {
        form.style.display = form.style.display === 'none' ? 'block' : 'none';
    }
}

function addNote(consultationId) {
    const textArea = document.getElementById(`noteText-${consultationId}`);
    const noteText = textArea ? textArea.value.trim() : '';

    if (!noteText) {
        showAlert('Пожалуйста, введите текст заметки.', 'error');
        return;
    }

    const token = localStorage.getItem('token');

    fetch(`/api/consultations/${consultationId}/add-note`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ note: noteText })
    })
    .then(response => {
        if (!response.ok) return response.json().then(err => { throw new Error(err.error); });
        return response.json();
    })
    .then(() => {
        loadConsultations();
        showAlert('Заметка успешно добавлена!', 'success');
    })
    .catch(err => {
        console.error('Ошибка при добавлении заметки:', err);
        showAlert(err.message || 'Ошибка добавления заметки', 'error');
    });
}
