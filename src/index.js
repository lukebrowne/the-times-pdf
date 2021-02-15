const fs = require("fs");
const puppeteer = require("puppeteer");
const { WebClient } = require("@slack/web-api");
const exiftool = require("node-exiftool");

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
    try {
        console.log("Launching browser");
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        await page._client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: '/tmp/the-times-downloads' });

        console.log("Going to epaper.thetimes.co.uk to authenticate");
        await page.goto("https://epaper.thetimes.co.uk");
      
        console.log("Waiting for navigation");
        await page.waitForNavigation({ waitUntil: "networkidle2" });
        
        console.log("Going to sign in");
        await page.waitForSelector('.toolbar-button-signin');
        await page.click('.toolbar-button-signin');

        await sleep(5000);

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

        const today = new Date();

        const isSunday = today.getDay() === 0;

        const publication = (isSunday ? "The Sunday Times" : "The Times");

        const ePaperPath = isSunday ? "/the-sunday-times" : "/the-times";

        console.log("Going to edition url epaper.thetimes.co.uk" + ePaperPath);
        await page.goto("https://epaper.thetimes.co.uk" + ePaperPath);

        await page.waitForNavigation({ waitUntil: "networkidle2" });

        await sleep(3000);

        console.log("Closing overlay");
        await page.waitForSelector('button.closeOverlay');
        await page.click('button.closeOverlay');

        await sleep(2000);

        const issues = [
            [
                "Travel",
                "Home",
                "Style",
                "Sport",
                "Culture",
                "Business",
                "The Magazine",
                "The Sunday Times",
            ],
            [
                "Times 2",
                "The Times"
            ],
            [
                "Times 2",
                "The Times"
            ],
            [
                "Times 2",
                "The Times"
            ],
            [
                "Times 2",
                "The Times"
            ],
            [
                "Bricks and Mortar",
                "Times 2",
                "The Times"
            ],
            [
                "Sports",
                "Weekend",
                "Saturday Review",
                "Times Magazine",
                "The Times"
            ]
        ];

        for (const issue of issues[today.getDay()]) {
            console.log("Attempting to send " + issue);

            console.log("Clicking menu");
            await page.waitForSelector('a.toolbar-button-appmenu');
            await page.click('a.toolbar-button-appmenu');

            await sleep(2000);
    
            console.log("Clicking publications menu");
            const [publicationMenuElement] = await page.$x("//a[contains(., 'Publications')]");
            await publicationMenuElement.click();

            await sleep(2000);
    
            console.log("Clicking " + publication);
            const [publicationElement] = await page.$x(`//a//em[contains(., '${publication}')]`);
            await publicationElement.click();
    
            await sleep(2000);

            console.log("Clicking " + issue);
            const [issueElement] = await page.$x(`//a//em[contains(., '${issue}')][following-sibling::span[contains(., '${today.getDate()}')]]`);
            await issueElement.click();
    
            await sleep(2000);
    
            console.log("Opening options");
            await page.waitForSelector('span.art-options-call');
            await page.click('span.art-options-call');
    
            await sleep(4000);
    
            console.log("Clicking download");
            const [download] = await page.$x("//li[contains(., 'Download')]");
            await download.click();
    
            await sleep(2000);
    
            console.log("Picking issue download");
            const [downloadIssue] = await page.$x("//li[contains(., 'Download Issue in PDF')]");
            await downloadIssue.click();
    
            await sleep(2000);
    
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
    
            const ep = new exiftool.ExiftoolProcess()
            
            const title = issue === publication ? issue + " · " + today.toDateString() :  issue + " · " + publication + " · " + today.toDateString();
            
            await ep.open()
                .then(() => ep.writeMetadata("/tmp/the-times-downloads/" + filename, {
                    Title: title,
                    Author: "News UK",
                    PageLayout: "TwoPageRight",
                    PageMode: "UseThumbs",
                }))
                .finally(() => ep.close());
            
            console.log("Sending file");
    
            const slack = new WebClient(process.env.SLACK_TOKEN);
    
            await slack.files.upload({
                filename,
                channels: process.env.SLACK_CHANNEL,
                filetype: "pdf",
                title,
                file: fs.createReadStream("/tmp/the-times-downloads/" + filename)
            })
        }

        await browser.close();
    } catch (error) {
        console.error(error);
    }
})();
