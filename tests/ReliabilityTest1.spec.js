const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test('Reliability-Maturity-Endurance Test', async ({ page }) => {
    const results = [];
    const startTestTime = Date.now(); // Waktu mulai pengujian
    const testDuration = 3 * 60 * 1000; // 3 menit dalam milidetik
    let iteration = 0;

    while (Date.now() - startTestTime < testDuration) {
        const startTime = Date.now();

        try {
            // Buka halaman utama dan catat waktu akses
            await page.goto('https://opibox.netlify.app/', { waitUntil: 'load', timeout: 10000 });

            // Klik tombol "Masuk"
            await page.getByRole('link', { name: 'Masuk' }).click();

            // Isi email dan kata sandi
            await page.getByRole('textbox', { name: 'Masukkan email' }).fill('an2000016080@webmail.uad.ac.id');
            await page.getByRole('textbox', { name: 'Masukkan kata sandi' }).fill('An_2000016080');

            // Klik tombol "Masuk"
            await page.getByRole('button', { name: 'Masuk' }).click();

            // Verifikasi login berhasil
            await expect(page.locator("//a[normalize-space()='Lihat semua']")).toBeVisible({ timeout: 10000 });

            const endTime = Date.now();
            const duration = endTime - startTime;

            // Catat hasil sukses
            results.push({
                iteration: iteration + 1,
                status: 'Success',
                loadTime: duration,
                timestamp: new Date().toISOString()
            });

            // Logout
            await page.getByRole('link', { name: 'Pengaturan' }).click();
            await page.click('#logout');
            await page.getByRole('button', { name: 'Ya' }).click();

            console.log(`Iteration ${iteration + 1}: Success, Duration: ${duration} ms`);
        } catch (error) {
            const errorTime = Date.now();
            results.push({
                iteration: iteration + 1,
                status: 'Failed',
                error: error.message,
                timestamp: new Date().toISOString(),
                loadTime: errorTime - startTime
            });

            console.error(`Iteration ${iteration + 1}: Failed, Error: ${error.message}`);
        }

        iteration++;
        // Tunggu 1 detik sebelum iterasi berikutnya
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Simpan hasil pengujian ke file TXT
    const txtFilePath = path.join(__dirname, 'Reliability-Maturity-EnduranceTest.txt');
    const txtContent = results.map(r =>
        `Iteration: ${r.iteration}, Status: ${r.status}, Load Time: ${r.loadTime} ms, Timestamp: ${r.timestamp}`
    ).join('\n');
    fs.writeFileSync(txtFilePath, txtContent, 'utf8');
    console.log('TXT report written successfully');

    // Simpan hasil pengujian ke file JSON
    const jsonFilePath = path.join(__dirname, 'Reliability-Maturity-EnduranceTest.json');
    const jsonContent = JSON.stringify(results, null, 2);
    fs.writeFileSync(jsonFilePath, jsonContent, 'utf8');
    console.log('JSON report written successfully');
});
