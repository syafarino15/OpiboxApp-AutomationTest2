const { test, expect } = require('@playwright/test');
const fs = require('fs');
const pidusage = require('pidusage'); // Paket untuk memantau penggunaan CPU dan memori proses

// Helper function untuk menyimpan hasil ke file
function logResult(fileName, data) {
    fs.appendFileSync(fileName, JSON.stringify(data, null, 2) + ',\n');
}

// Helper function untuk membuat nama file berdasarkan timestamp
function getFileName(baseName) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${baseName}_${timestamp}.json`;
}

const logFileName = getFileName('PerformanceTest2_Report');
const urlToTest = 'https://opibox.netlify.app/';
const maxExecutionTimePerUser = 10; // Maksimal waktu eksekusi per pengguna (detik)
const minSuccessRate = 90; // Minimal persentase keberhasilan (%)
const maxCpuUsage = 80; // Maksimal penggunaan CPU (%)
const maxMemoryUsage = 500; // Maksimal penggunaan memori (MB)

test('Performance Test: Access URL with Time Behavior, Capacity, and Resource Utilization', async ({ browser }) => {
    const startTime = Date.now();
    const results = [];
    const userScenarios = [1, 10, 50]; // Skenario jumlah pengguna yang akan diuji

    // Uji untuk setiap skenario pengguna
    for (let users of userScenarios) {
        console.log(`Running test for ${users} users...`);

        const promises = [];

        // Simulasikan beberapa pengguna secara paralel
        for (let i = 0; i < users; i++) {
            promises.push(simulateAccess(browser, urlToTest, i + 1));
        }

        // Tunggu semua pengguna selesai
        const userResults = await Promise.all(promises);
        const endTime = Date.now();

        // Hitung statistik Time Behavior
        const totalExecutionTime = (endTime - startTime) / 1000; // dalam detik
        const averageExecutionTime = totalExecutionTime / users;

        // Hitung statistik Capacity
        const successfulRequests = userResults.filter(r => r.status === 'Passed').length;
        const failedRequests = userResults.filter(r => r.status === 'Failed').length;
        const successRate = (successfulRequests / users) * 100;

        // Pantau Resource Utilization
        const usageStats = await pidusage(process.pid);

        // Kompilasi hasil
        const testResult = {
            standards: {
                maxExecutionTimePerUser: `${maxExecutionTimePerUser}s`,
                minSuccessRate: `${minSuccessRate}%`,
                maxCpuUsage: `${maxCpuUsage}%`,
                maxMemoryUsage: `${maxMemoryUsage}MB`,
            },
            timeBehavior: {
                totalExecutionTime: `${totalExecutionTime}s`,
                averageExecutionTime: `${averageExecutionTime}s`,
            },
            capacity: {
                numberOfUsers: users,
                successfulRequests,
                failedRequests,
                successRate: `${successRate.toFixed(2)}%`,
            },
            resourceUtilization: {
                cpu: `${usageStats.cpu.toFixed(2)}%`,
                memory: `${(usageStats.memory / 1024 / 1024).toFixed(2)} MB`,
            },
            status:
                successRate >= minSuccessRate &&
                    usageStats.cpu <= maxCpuUsage &&
                    usageStats.memory / 1024 / 1024 <= maxMemoryUsage &&
                    averageExecutionTime <= maxExecutionTimePerUser
                    ? 'Passed'
                    : 'Failed',
        };

        // Log hasil ke file JSON
        results.push(testResult);
        logResult(logFileName, testResult);

        // Menulis laporan terperinci
        logDescriptiveReport(logFileName, testResult);

        console.log('Performance Test Completed for', users, 'users. Results logged to:', logFileName);
    }
});

// Fungsi untuk menyimulasikan akses tanpa login
async function simulateAccess(browser, url, userId) {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        const userStartTime = Date.now();

        // Navigasi ke URL tanpa login
        const response = await page.goto(url, {
            waitUntil: 'domcontentloaded', // Tunggu hingga DOM sepenuhnya dimuat
            timeout: 60000, // Timeout 60 detik
        });

        if (!response.ok()) {
            throw new Error(`Failed to load page with status: ${response.status()}`);
        }

        // Tunggu untuk mensimulasikan interaksi pengguna
        await page.waitForTimeout(1000); // 1 detik

        const userEndTime = Date.now();
        const executionTime = (userEndTime - userStartTime) / 1000; // dalam detik

        if (executionTime > maxExecutionTimePerUser) {
            throw new Error(`Execution time exceeded ${maxExecutionTimePerUser} seconds.`);
        }

        await context.close();
        return { userId, executionTime, status: 'Passed' };
    } catch (error) {
        console.error(`Error for user ${userId}:`, error);

        await context.close();
        return { userId, executionTime: null, status: 'Failed', error: error.message };
    }
}

// Fungsi untuk menyimpan laporan dalam format lebih deskriptif
function logDescriptiveReport(fileName, testResult) {
    const reportContent = `
    =========================================
    Performance Test Report
    =========================================
    Standards:
    - Maximum Execution Time Per User: ${testResult.standards.maxExecutionTimePerUser}
    - Minimum Success Rate: ${testResult.standards.minSuccessRate}
    - Maximum CPU Usage: ${testResult.standards.maxCpuUsage}
    - Maximum Memory Usage: ${testResult.standards.maxMemoryUsage}
    
    Results:
    Time Behavior:
    - Total Execution Time: ${testResult.timeBehavior.totalExecutionTime}
    - Average Execution Time: ${testResult.timeBehavior.averageExecutionTime}
    
    Capacity:
    - Number of Users: ${testResult.capacity.numberOfUsers}
    - Successful Requests: ${testResult.capacity.successfulRequests}
    - Failed Requests: ${testResult.capacity.failedRequests}
    - Success Rate: ${testResult.capacity.successRate}
    
    Resource Utilization:
    - CPU Usage: ${testResult.resourceUtilization.cpu}
    - Memory Usage: ${testResult.resourceUtilization.memory}
    
    Overall Status: ${testResult.status}
    =========================================
    `;
    fs.writeFileSync(fileName.replace('.json', '.txt'), reportContent);
};
