const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;

// Настройка middleware
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// Пути к файлам данных
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const CONSULTATIONS_FILE = path.join(DATA_DIR, 'consultations.json');

// Создаем папку data если ее нет
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

// Загрузка данных из файлов
let users = [];
let consultations = [];

function loadInitialData() {
    try {
        users = fs.existsSync(USERS_FILE)
            ? JSON.parse(fs.readFileSync(USERS_FILE))
            : [
                { username: 'ivanov_i', fullName: 'Иванов Иван Иванович', password: '1234', role: 'doctor' },
                { username: 'petrov_v', fullName: 'Петров Василий Владимирович', password: '1234', role: 'doctor' },
                { username: 'bykov_a', fullName: 'Быков Алексей Евгеньевич', password: '1234', role: 'doctor' },
                { username: 'grinko_s', fullName: 'Гринько Софья Сергеевна', password: '1234', role: 'patient' },
                { username: 'zabugina_e', fullName: 'Забугина Екатерина Андреевна', password: '1234', role: 'patient' }
            ];

        consultations = fs.existsSync(CONSULTATIONS_FILE)
            ? JSON.parse(fs.readFileSync(CONSULTATIONS_FILE))
            : [];
    } catch (err) {
        console.error('Ошибка загрузки данных:', err);
        process.exit(1);
    }}
// Сохранение данных в файлы
function saveData() {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        fs.writeFileSync(CONSULTATIONS_FILE, JSON.stringify(consultations, null, 2)); // Исправлено
    } catch (err) {
        console.error('Ошибка сохранения данных:', err);
    }
}

// Инициализация данных
loadInitialData();

// JWT секретный ключ
const SECRET_KEY = 'your-secret-key-here';

// Настройки расписания врачей
const WORK_DAYS = {
    'ivanov_i': [1, 2, 3, 4, 5], // Пн-Пт
    'petrov_v': [1, 2, 3, 4, 5],  // Пн-Пт
    'bykov_a': [0, 6]             // Выходные (0 - воскресенье, 6 - суббота)
};

const WORK_HOURS = {
    'ivanov_i': { start: 9, end: 14 }, // с 9:00 до 22:00
    'petrov_v': { start: 8, end: 17 },  // с 8:00 до 20:00
    'bykov_a': { start: 10, end:18} // с 10:00 до 23:30 (23.5 = 23:30)
};

const CONSULTATION_DURATION = 30; // 30 минут

// Информация о врачах
const doctorDetails = [
    { 
        username: "ivanov_i", 
        fullName: "Иванов Иван Иванович", 
        specialization: "Терапевт",
        experience: "10 лет",
        about: "Работа врачом-эндоскопистом (выполнение гастро-, колоно-, бронхоскопии с забором биопсийного материала); амбулаторный прием врача-хирурга, работа в перевязочном кабинете, дежурства в стационаре, работа врачом-хирургом в составе призывной комиссии военкомата, проведение медицинских осмотров.Работаю по настоящее время. Заведование эндоскопическим отделением, совмещение в отделе управления качеством медицинской помощи и стратегического развития."
    },
    { 
        username: "petrov_v", 
        fullName: "Петров Василий Владимирович", 
        specialization: "Диагност",
        experience: "15 лет",
        about: "Врач-терапевт с 13-летним опытом работы. Разработала и внедрила систему ранней диагностики заболеваний ЖКТ, что за три года увеличило количество выявленных случаев на ранних стадиях на 34%.  Победитель областного конкурса “Терапевт года” в 2015 году.Ключевые навыки:Осмотр пациентов, сбор анамнеза.Знание современных методов диагностики.Работа с медицинским оборудованием"
    },
    { 
        username: "bykov_a", 
        fullName: "Быков Алексей Евгеньевич", 
        specialization: "Семейный врач",
        experience: "8 лет",
        about: "Специалист широкого профиля. Работаю по выходным."
    }
];

// Вспомогательные функции для работы с временем
function isWorkDay(date, doctor) {
    const day = new Date(date).getDay(); // 0-6 (Вс-Сб)
    return WORK_DAYS[doctor]?.includes(day) || false;
}

function isWorkTime(time, doctor) {
    const [hours, minutes] = time.split(':').map(Number);
    const workHours = WORK_HOURS[doctor] || { start: 0, end: 24 };
    const endHour = Math.floor(workHours.end);
    const endMinute = (workHours.end % 1) * 60;
    
    return (hours > workHours.start || 
           (hours === workHours.start && minutes >= 0)) &&
           (hours < endHour || 
           (hours === endHour && minutes <= endMinute));
}

function isTimeSlotAvailable(doctor, date, time) {
    const consultationEnd = addMinutes(time, CONSULTATION_DURATION);
    return !consultations.some(c => 
        c.doctor === doctor && 
        c.date === date && 
        c.status !== 'canceled' &&
        isTimeOverlap(c.time, addMinutes(c.time, CONSULTATION_DURATION), time, consultationEnd)
    );
}

function addMinutes(time, minutes) {
    const [hours, mins] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMins = totalMinutes % 60;
    return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
}

function isTimeOverlap(start1, end1, start2, end2) {
    return start1 < end2 && start2 < end1;
}

function generateTimeSlots(startHour, endHour, duration) {
    const slots = [];
    const endHourInt = Math.floor(endHour);
    const endMinutes = (endHour % 1) * 60;
    
    for (let hour = startHour; hour <= endHourInt; hour++) {
        const maxMinute = hour === endHourInt ? endMinutes : 60 - duration;
        
        for (let minute = 0; minute <= maxMinute; minute += duration) {
            const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            slots.push(time);
        }
    }
    return slots;
}

// Middleware для проверки аутентификации
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// Генерация токена
function generateToken(username, role) {
    return jwt.sign({ username, role }, SECRET_KEY, { expiresIn: '1h' });
}

// Генерация ссылки на консультацию
function generateMeetLink() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for (let i = 0; i < 10; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `https://meet.google.com/${id.slice(0, 3)}-${id.slice(3, 6)}-${id.slice(6, 10)}`;
}

app.post('/api/register', (req, res) => {
    const { fullName, username, password } = req.body;

    // Валидация
    if (!fullName || !username || !password) {
        return res.status(400).json({ error: 'Все поля обязательны для заполнения' });
    }

    // Проверка существования пользователя
    if (users.some(u => u.username === username)) {
        return res.status(400).json({ error: 'Пользователь уже существует' });
    }

    // Добавление нового пациента
    const newUser = {
        username: username,
        fullName: fullName,
        password: password,
        role: 'patient'
    };

    users.push(newUser);
    saveData();

    res.status(201).json({ 
        message: 'Регистрация успешна!',
        user: { username: username, fullName: fullName, role: 'patient' }
    });
});

// API для входа
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);

    if (!user) {
        return res.status(401).json({ error: 'Неверные учетные данные' });
    }

    const token = generateToken(user.username, user.role, user.fullName);
    res.json({ 
        token, 
        role: user.role, 
        username: user.username,
        fullName: user.fullName 
    });
});

// Обновленная функция генерации токена
function generateToken(username, role, fullName) {
    return jwt.sign({ username, role, fullName }, SECRET_KEY, { expiresIn: '1h' });
}

// API для получения списка врачей (обновлено для отображения только ФИО)
app.get('/api/doctors', authenticateToken, (req, res) => {
    const doctors = users
        .filter(user => user.role === 'doctor')
        .map(doctor => {
            const details = doctorDetails.find(d => d.username === doctor.username) || {};

            return {
                username: doctor.username,
                name: doctor.fullName || doctor.username,
                specialization: details.specialization || 'Не указана',
                experience: details.experience || 'Опыт не указан',
                about: details.about || 'Информация отсутствует',
                workDays: WORK_DAYS[doctor.username] || [],
                workHours: WORK_HOURS[doctor.username] || { start: 0, end: 24 }
            };
        });
    res.json(doctors);
});

// API для получения доступного времени
app.get('/api/available-time', authenticateToken, (req, res) => {
    const { doctor, date } = req.query;
    
    if (!doctor || !date) {
        return res.status(400).json({ error: 'Не указан врач или дата' });
    }

    // Проверяем рабочий день врача
    if (!isWorkDay(date, doctor)) {
        return res.json({ 
            availableTimeSlots: [],
            message: 'Врач не работает в этот день'
        });
    }

    const workHours = WORK_HOURS[doctor] || { start: 0, end: 24 };
    const allSlots = generateTimeSlots(workHours.start, workHours.end, CONSULTATION_DURATION);
    
    // Фильтруем занятые слоты
    const availableSlots = allSlots.filter(time => 
        isTimeSlotAvailable(doctor, date, time)
    );

    res.json({ 
        availableTimeSlots: availableSlots,
        workHours: workHours
    });
});

// API для записи на консультацию
app.post('/api/consultations', authenticateToken, (req, res) => {
    const { doctor, date, time, patientName } = req.body;
    
    // Проверка даты
    const appointmentDate = new Date(`${date}T${time}`);
    if (appointmentDate <= new Date()) {
        return res.status(400).json({ error: 'Нельзя записаться на прошедшую дату' });
    }

    // Проверка существования врача
    if (!users.some(u => u.username === doctor && u.role === 'doctor')) {
        return res.status(400).json({ error: 'Указанный врач не существует' });
    }

    // Проверка рабочего дня
    if (!isWorkDay(date, doctor)) {
        return res.status(400).json({ error: 'Врач не работает в этот день' });
    }

    // Проверка рабочего времени
    if (!isWorkTime(time, doctor)) {
        return res.status(400).json({ error: 'Врач не работает в это время' });
    }

    // Проверка доступности времени
    if (!isTimeSlotAvailable(doctor, date, time)) {
        return res.status(400).json({ error: 'Это время уже занято' });
    }

    const meetLink = generateMeetLink();
    const newAppointment = {
        id: Date.now().toString(),
        doctor,
        date,
        time,
        patientName,
        meetLink,
        status: 'upcoming',
        createdAt: new Date().toISOString()
    };

    consultations.push(newAppointment);
    saveData();

    res.status(201).json(newAppointment);
});
app.get('/api/users', (req, res) => {
    res.json(users);
});


// API для получения консультаций
app.get('/api/consultations', authenticateToken, (req, res) => {
    const user = req.user;
    let userConsultations = consultations.filter(c => 
        (user.role === 'doctor' && c.doctor === user.username) ||
        (user.role === 'patient' && c.patientName === user.username)
    ).map(c => {
        // Добавляем полные имена
        const doctor = users.find(u => u.username === c.doctor);
        const patient = users.find(u => u.username === c.patientName);
        return {
            ...c,
            doctorDisplayName: doctor ? doctor.fullName : c.doctor,
            patientDisplayName: patient ? patient.fullName : c.patientName
        };
    });
    
    res.json(userConsultations);
});
// API для получения истории выписок
app.get('/discharge-history', authenticateToken, (req, res) => {
    const { doctor, patientName } = req.query;

    const dischargeHistory = consultations
        .filter(c => 
            c.doctor === doctor && 
            c.patientName === patientName && 
            c.dischargeText
        )
        .map(c => ({
            date: c.date,
            time: c.time,
            note: c.dischargeText
        }));

    res.json(dischargeHistory);
});

// API для отмены консультации
app.patch('/api/consultations/:id/cancel', authenticateToken, (req, res) => {
    const appointmentId = req.params.id;
    const appointment = consultations.find(a => a.id === appointmentId);
    
    if (!appointment) {
        return res.status(404).json({ error: 'Консультация не найдена' });
    }

    // Проверка прав доступа
    const user = req.user;
    if (user.role === 'doctor' && appointment.doctor !== user.username) {
        return res.status(403).json({ error: 'Нет прав для отмены этой консультации' });
    }
    if (user.role === 'patient' && appointment.patientName !== user.username) {
        return res.status(403).json({ error: 'Нет прав для отмены этой консультации' });
    }

    appointment.status = 'canceled';
    saveData();
    
    res.json(appointment);
});

// API для завершения консультации (только для врачей)
app.patch('/api/consultations/:id/complete', authenticateToken, (req, res) => {
    const user = req.user;
    if (user.role !== 'doctor') {
        return res.status(403).json({ error: 'Только врачи могут завершать консультации' });
    }

    const appointmentId = req.params.id;
    const appointment = consultations.find(a => a.id === appointmentId);
    
    if (!appointment) {
        return res.status(404).json({ error: 'Консультация не найдена' });
    }

    if (appointment.doctor !== user.username) {
        return res.status(403).json({ error: 'Вы не можете завершить чужую консультацию' });
    }

    // Получаем текст выписки из запроса
    const { dischargeText } = req.body;

    // Сохраняем текст выписки, если он есть
    if (dischargeText) {
        appointment.dischargeText = dischargeText;
    }

    appointment.status = 'completed';
    saveData();
    
    res.json(appointment);
});

// Обработка завершения работы
process.on('SIGINT', () => {
    console.log('Сохранение данных перед завершением...');
    saveData();
    process.exit();
});


app.patch('/api/consultations/:id/add-note', authenticateToken, (req, res) => {
    const user = req.user;
    if (user.role !== 'doctor') {
        return res.status(403).json({ error: 'Только врачи могут добавлять заметки' });
    }

    const appointmentId = req.params.id;
    const appointment = consultations.find(a => a.id === appointmentId);
    
    if (!appointment) {
        return res.status(404).json({ error: 'Консультация не найдена' });
    }

    if (appointment.doctor !== user.username) {
        return res.status(403).json({ error: 'Вы не можете добавлять заметки к чужой консультации' });
    }

    const { note } = req.body;
    if (!note) {
        return res.status(400).json({ error: 'Текст заметки обязателен' });
    }

    if (!appointment.notes) {
        appointment.notes = [];
    }

    appointment.notes.push({
        text: note,
        createdAt: new Date().toISOString(),
        addedBy: user.username
    });

    saveData();
    
    res.json(appointment);
});


// Запуск сервера
app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
    console.log('Загружено пользователей:', users.length);
    console.log('Загружено консультаций:', consultations.length);
});

