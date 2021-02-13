const fs = require("fs");
const puppeteer = require("puppeteer");
const { WebClient } = require("@slack/web-api");

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
    try {
        console.log("Launching browser");
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        await page._client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: '/tmp/the-times-downloads' });
        
        console.log("Going to epaper.thetimes.co.uk");
        await page.goto("https://epaper.thetimes.co.uk");
      
        console.log("Waiting for navigation");
        await page.waitForNavigation({ waitUntil: "networkidle2" });
        
        console.log("Going to sign in");
        await page.waitForSelector('.toolbar-button-signin');
        await page.click('.toolbar-button-signin');

        await sleep(3000);
      
        console.log("Entering email");
        await page.waitForSelector('input[name="email"]');
        await page.type('input[name="email"]', process.env.TIMES_EMAIL, { delay: 50 });
        
        console.log("Entering password");
        await page.waitForSelector('input[name="password"]');
        await page.type('input[name="password"]', process.env.TIMES_PASSWORD, { delay: 50 });

        console.log("Clicking submit");
        await page.waitForSelector('button[type="submit"]');
        await page.click('button[type="submit"]');

        console.log("Waiting for redirect");
        await sleep(3000);

        console.log("Waiting for signed in success");
        await page.waitForSelector('a.toolbar-button-signin span.logged-in');

        await sleep(3000);

        console.log("Closing overlay");
        await page.waitForSelector('button.closeOverlay');
        await page.click('button.closeOverlay');

        await sleep(1000);

        console.log("Opening options");
        await page.waitForSelector('span.art-options-call');
        await page.click('span.art-options-call');

        await sleep(1000);

        console.log("Clicking download");
        const [download] = await page.$x("//li[contains(., 'Download')]");
        await download.click();

        await sleep(1000);

        console.log("Picking issue download");
        const [downloadIssue] = await page.$x("//li[contains(., 'Download Issue in PDF')]");
        await downloadIssue.click();

        await sleep(1000);

        console.log("Confirming personal usage");
        const [confirm] = await page.$x("//button[contains(., 'Download Issue in PDF')]");
        await confirm.click();

        console.log("Downloading file");

        const filename = await new Promise((resolve, reject) => {
            const watcher = fs.watch("/tmp/the-times-downloads", (eventType, filename) => {
                // this is the last event from a chrome download (most are for `.crdownload` files)
                // there are two final `rename` events from `.crdownload` to the correct `pdf` name
                // and then one final `change` event updating metadata
                if (eventType === "change" && /^.*\.pdf$/.test(filename)) {
                    // defuse the bombs first
                    clearTimeout(rejectHandle);
                    watcher.close();
                    
                    return resolve(filename);
                }
            })

            // reject the promise and stop watching if we get to 50 seconds
            const rejectHandle = setTimeout(() => {
                watcher.close();
                reject(new Error("Unable to download The Times issue within 50s"))
            }, 50000);
        });
        
        console.log("Sending file");

        const slack = new WebClient(process.env.SLACK_TOKEN);

        const today = new Date();

        await slack.files.upload({
            filename,
            channels: process.env.SLACK_CHANNEL,
            filetype: "pdf",
            title: (today.getDay() === 0 ? "The Sunday Times" : "The Times") + " · " + today.toDateString(),
            initial_comment: "Paper delivery is here 🚲 🗞",
            file: fs.createReadStream("/tmp/the-times-downloads/" + filename)
        })

        await browser.close();
    } catch (error) {
        console.error(error);
    }
})();
