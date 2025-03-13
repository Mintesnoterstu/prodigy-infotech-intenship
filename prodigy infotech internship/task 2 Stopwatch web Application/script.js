class Stopwatch {
    constructor() {
        this.display = document.querySelector('.display');
        this.startBtn = document.getElementById('startBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.lapBtn = document.getElementById('lapBtn');
        this.lapList = document.getElementById('lapList');

        this.running = false;
        this.startTime = 0;
        this.elapsedTime = 0;
        this.intervalId = null;
        this.lapCount = 1;

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        this.startBtn.addEventListener('click', () => this.start());
        this.pauseBtn.addEventListener('click', () => this.pause());
        this.resetBtn.addEventListener('click', () => this.reset());
        this.lapBtn.addEventListener('click', () => this.lap());
    }

    start() {
        if (!this.running) {
            this.running = true;
            this.startTime = Date.now() - this.elapsedTime;
            this.intervalId = setInterval(() => this.updateDisplay(), 10);
            this.startBtn.disabled = true;
            this.pauseBtn.disabled = false;
        }
    }

    pause() {
        if (this.running) {
            this.running = false;
            clearInterval(this.intervalId);
            this.startBtn.disabled = false;
            this.pauseBtn.disabled = true;
        }
    }

    reset() {
        this.running = false;
        clearInterval(this.intervalId);
        this.elapsedTime = 0;
        this.updateDisplay();
        this.lapList.innerHTML = '';
        this.lapCount = 1;
        this.startBtn.disabled = false;
        this.pauseBtn.disabled = false;
    }

    lap() {
        if (this.running) {
            const lapTime = this.formatTime(this.elapsedTime);
            const lapItem = document.createElement('li');
            lapItem.textContent = `Lap ${this.lapCount}: ${lapTime}`;
            this.lapList.insertBefore(lapItem, this.lapList.firstChild);
            this.lapCount++;
        }
    }

    updateDisplay() {
        this.elapsedTime = Date.now() - this.startTime;
        this.display.textContent = this.formatTime(this.elapsedTime);
    }

    formatTime(ms) {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        const centiseconds = Math.floor((ms % 1000) / 10);

        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${centiseconds.toString().padStart(2, '0')}`;
    }
}

// Initialize the stopwatch when the page loadsgf
document.addEventListener('DOMContentLoaded', () => {
    const stopwatch = new Stopwatch();
}); 