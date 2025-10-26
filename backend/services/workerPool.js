const { Worker } = require('worker_threads');
const path = require('path');
const os = require('os');

class WorkerPool {
    constructor(workerScript, poolSize = os.cpus().length) {
        this.workerScript = workerScript;
        this.poolSize = poolSize;
        this.workers = [];
        this.taskQueue = [];
        this.activeWorkers = new Set();
        
        this.initializePool();
    }

    initializePool() {
        for (let i = 0; i < this.poolSize; i++) {
            this.workers.push({
                id: i,
                worker: null,
                busy: false
            });
        }
    }

    async executeTask(data) {
        return new Promise((resolve, reject) => {
            const task = { data, resolve, reject };
            
            const availableWorker = this.workers.find(w => !w.busy);
            
            if (availableWorker) {
                this.runTask(availableWorker, task);
            } else {
                this.taskQueue.push(task);
            }
        });
    }

    runTask(workerInfo, task) {
        workerInfo.busy = true;
        
        const worker = new Worker(this.workerScript, {
            workerData: task.data
        });
        
        workerInfo.worker = worker;
        
        worker.on('message', (result) => {
            task.resolve(result);
            this.onWorkerComplete(workerInfo);
        });
        
        worker.on('error', (error) => {
            task.reject(error);
            this.onWorkerComplete(workerInfo);
        });
        
        worker.on('exit', (code) => {
            if (code !== 0) {
                task.reject(new Error(`Worker stopped with exit code ${code}`));
            }
            this.onWorkerComplete(workerInfo);
        });
    }

    onWorkerComplete(workerInfo) {
        workerInfo.busy = false;
        workerInfo.worker = null;
        
        if (this.taskQueue.length > 0) {
            const nextTask = this.taskQueue.shift();
            this.runTask(workerInfo, nextTask);
        }
    }

    async terminate() {
        const terminationPromises = this.workers
            .filter(w => w.worker)
            .map(w => w.worker.terminate());
        
        await Promise.all(terminationPromises);
        this.workers = [];
        this.taskQueue = [];
    }
}

// Create worker pools for different tasks
const steganographyWorkerPool = new WorkerPool(
    path.join(__dirname, 'workers', 'steganographyWorker.js'),
    Math.max(2, Math.floor(os.cpus().length / 2))
);

const encryptionWorkerPool = new WorkerPool(
    path.join(__dirname, 'workers', 'encryptionWorker.js'),
    os.cpus().length
);

const messageWorkerPool = new WorkerPool(
    path.join(__dirname, 'workers', 'messageWorker.js'),
    os.cpus().length
);

module.exports = {
    WorkerPool,
    steganographyWorkerPool,
    encryptionWorkerPool,
    messageWorkerPool
};
