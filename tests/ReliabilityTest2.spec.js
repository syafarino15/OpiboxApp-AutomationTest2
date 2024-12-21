const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test('Reliability Availability Test - 50 Concurrent Users Multiple Iterations', async ({ browser }) => {
    const totalUsers = 10; // Jumlah user simultan
    const duration = 3 * 60 * 1000; // Durasi total: 3 menit dalam milidetik
    const results = []; // Array untuk menyimpan hasil pengujian
    const startTimeOverall = Date.now(); // Waktu mulai pengujian

    // Fungsi untuk satu user menjalankan alur akses
    const userTest = async (userId) => {
        const context = await browser.newContext();
        const page = await context.newPage();

        try {
            // Lakukan alur selama total waktu belum tercapai
            while (Date.now() - startTimeOverall < duration) {
                const startTime = Date.now();
                let status = 'Success';

                try {
                    // Buka halaman utama dan catat waktu load
                    await page.goto('https://opibox.netlify.app/', { waitUntil: 'load', timeout: 10000 });

                    // Klik tombol "Masuk"
                    await page.getByRole('link', { name: 'Masuk' }).click();

                    // Isi email dan kata sandi
                    await page.getByRole('textbox', { name: 'Masukkan email' }).fill('syafarino010502@gmail.com');
                    await page.getByRole('textbox', { name: 'Masukkan kata sandi' }).fill('Password_1');

                    // Klik tombol "Masuk"
                    await page.getByRole('button', { name: 'Masuk' }).click();

                    // Verifikasi login berhasil
                    await expect(page.locator("//a[normalize-space()='Lihat semua']")).toBeVisible({ timeout: 10000 });

                    // Logout
                    await page.getByRole('link', { name: 'Pengaturan' }).click();
                    await page.click('#logout');
                    await page.getByRole('button', { name: 'Ya' }).click();

                    const endTime = Date.now();
                    const loadTime = endTime - startTime;

                    // Simpan hasil sukses
                    results.push({
                        userId,
                        status,
                        loadTime,
                        timestamp: new Date().toISOString(),
                    });

                    console.log(`User ${userId}: Success, Load Time: ${loadTime} ms`);
                } catch (error) {
                    const errorTime = Date.now();
                    status = 'Failed';

                    // Simpan hasil gagal
                    results.push({
                        userId,
                        status,
                        error: error.message,
                        loadTime: errorTime - startTime,
                        timestamp: new Date().toISOString(),
                    });

                    console.error(`User ${userId}: Failed, Error: ${error.message}`);
                }
            }
        } finally {
            await context.close();
        }
    };

    // Jalankan 50 user secara paralel
    const userPromises = [];
    for (let i = 1; i <= totalUsers; i++) {
        userPromises.push(userTest(i));
    }

    await Promise.all(userPromises);

    // Statistik Laporan
    const successfulUsers = results.filter(r => r.status === 'Success');
    const failedUsers = results.filter(r => r.status === 'Failed');

    const totalIterations = results.length;
    const totalSuccess = successfulUsers.length;
    const totalFailures = failedUsers.length;

    const loadTimes = successfulUsers.map(r => r.loadTime);
    const fastestLoadTime = Math.min(...loadTimes);
    const slowestLoadTime = Math.max(...loadTimes);
    const averageLoadTime = loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length;

    // Simpan hasil ke file TXT
    const txtFilePath = path.join(__dirname, 'Reliability-Availability.txt');
    const txtContent = `
===== Availability Test Summary =====
Total Iterations: ${totalIterations}
Total Users: ${totalUsers}
Successful Loads: ${totalSuccess}
Failed Loads: ${totalFailures}
Fastest Load Time: ${fastestLoadTime} ms
Slowest Load Time: ${slowestLoadTime} ms
Average Load Time: ${averageLoadTime.toFixed(2)} ms

===== Detailed Results =====
${results.map(r =>
        `User: ${r.userId}, Status: ${r.status}, Load Time: ${r.loadTime || 'N/A'} ms, Timestamp: ${r.timestamp}`
    ).join('\n')}
    `;
    fs.writeFileSync(txtFilePath, txtContent, 'utf8');
    console.log('TXT report written successfully');

    // Simpan hasil ke file JSON
    const jsonFilePath = path.join(__dirname, 'Reliability-Availability.json');
    const jsonContent = {
        summary: {
            totalIterations,
            totalUsers,
            successfulLoads: totalSuccess,
            failedLoads: totalFailures,
            fastestLoadTime,
            slowestLoadTime,
            averageLoadTime: averageLoadTime.toFixed(2),
        },
        detailedResults: results,
    };
    fs.writeFileSync(jsonFilePath, JSON.stringify(jsonContent, null, 2), 'utf8');
    console.log('JSON report written successfully');
});
