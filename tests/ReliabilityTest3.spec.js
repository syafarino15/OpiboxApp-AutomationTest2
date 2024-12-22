const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test('Recoverability Test - Forced Restart', async ({ browser }) => {
    const results = []; // Untuk menyimpan hasil pengujian
    let testSummary = {}; // Untuk menyimpan ringkasan hasil

    const appUrl = 'https://opibox.netlify.app/';
    const userEmail = 'syafarino010502@gmail.com';
    const userPassword = 'Password_1';

    // Simulasikan langkah-langkah Recoverability Test
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        // 1. Jalankan aplikasi dan lakukan login
        console.log('Step 1: Log in to the application');
        const startTime = Date.now();

        await page.goto(appUrl, { waitUntil: 'load', timeout: 60000 });
        await page.getByRole('link', { name: 'Masuk' }).click();
        await page.getByRole('textbox', { name: 'Masukkan email' }).fill(userEmail);
        await page.getByRole('textbox', { name: 'Masukkan kata sandi' }).fill(userPassword);
        await page.getByRole('button', { name: 'Masuk' }).click();

        // Verifikasi login berhasil
        await expect(page.locator("//a[normalize-space()='Lihat semua']")).toBeVisible({ timeout: 30000 });

        const loginDuration = Date.now() - startTime;
        results.push({
            step: 'Login',
            status: 'Success',
            duration: loginDuration,
            timestamp: new Date().toISOString(),
        });
        console.log(`Login successful in ${loginDuration} ms`);


        console.log('Step 2: Simulating forced restart of the application');
        await page.context().close();

        const restartDuration = 1000;
        await new Promise(resolve => setTimeout(resolve, restartDuration));
        results.push({
            step: 'Forced Restart',
            status: 'Simulated',
            duration: restartDuration,
            timestamp: new Date().toISOString(),
        });
        console.log(`Forced restart simulated with duration of ${restartDuration} ms`);

        console.log('Step 3: Checking if the user is still logged in after restart');
        const newContext = await browser.newContext();
        const newPage = await newContext.newPage();

        const restartCheckStartTime = Date.now();
        await newPage.goto(appUrl, { waitUntil: 'load', timeout: 60000 });

        const isStillLoggedIn = await newPage.locator("//a[normalize-space()='Lihat semua']").isVisible();
        const restartCheckDuration = Date.now() - restartCheckStartTime;

        if (isStillLoggedIn) {
            results.push({
                step: 'Recoverability Check',
                status: 'Success',
                duration: restartCheckDuration,
                timestamp: new Date().toISOString(),
            });
            testSummary = {
                status: 'Success',
                message: 'User remains logged in after forced restart. Recoverability test passed.',
            };
            console.log(`User remains logged in. Recoverability check successful in ${restartCheckDuration} ms`);
        } else {
            results.push({
                step: 'Recoverability Check',
                status: 'Failed',
                duration: restartCheckDuration,
                timestamp: new Date().toISOString(),
            });
            testSummary = {
                status: 'Failed',
                message: 'User session was lost after forced restart. Recoverability test failed.',
            };
            console.error(`User is logged out. Recoverability check failed in ${restartCheckDuration} ms`);
        }

        // Tutup sesi baru
        await newContext.close();
    } catch (error) {
        results.push({
            step: 'Unexpected Error',
            status: 'Failed',
            error: error.message,
            timestamp: new Date().toISOString(),
        });
        testSummary = {
            status: 'Failed',
            message: `Unexpected error occurred: ${error.message}`,
        };
        console.error(`An error occurred: ${error.message}`);
    } finally {
        // Simpan hasil pengujian ke file JSON
        const jsonFilePath = path.join(__dirname, 'Reliability-RecoverabilityTest.json');
        const jsonContent = {
            summary: testSummary,
            steps: results,
        };
        fs.writeFileSync(jsonFilePath, JSON.stringify(jsonContent, null, 2), 'utf8');
        console.log('JSON report written successfully to Recoverability-Test.json');

        // Simpan hasil pengujian ke file TXT
        const txtFilePath = path.join(__dirname, 'Reliability-RecoverabilityTest.txt');
        const txtContent = `Test Summary:\nStatus: ${testSummary.status}\nMessage: ${testSummary.message}\n\nDetails:\n` +
            results.map(r =>
                `Step: ${r.step}, Status: ${r.status}, Duration: ${r.duration || 'N/A'} ms, Timestamp: ${r.timestamp}`
            ).join('\n');
        fs.writeFileSync(txtFilePath, txtContent, 'utf8');
        console.log('TXT report written successfully to Recoverability-Test.txt');

        // Tutup sesi browser awal
        await context.close();
    }
});
