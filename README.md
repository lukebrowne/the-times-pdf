# the-times-pdf ![Deliver](https://github.com/lukebrowne/the-times-pdf/workflows/Deliver/badge.svg?branch=main&event=schedule)

I can't read an e-Paper version of The Times (UK) on iOS anymore (previously
was using [PressReader](https://pressreader.com) but they've removed their
unoffical support for The Times subscriptions and is not available to buy in
the app). However the PressReader content is still available on web and
available to download as a PDF. I want to fix this by sending myself the PDF of
the paper every morning 📰

This downloads the latest version of The Times/The Sunday Times and
supplements, downloads them as PDFs and sends them as Slack messages that I
pick up to read on my iPad.

![Example Sunday Times PDF via Slack](./example-message.jpg)

## Usage

I run this on a [cron GitHub Action every morning](https://github.com/lukebrowne/the-times-pdf/actions?query=workflow%3ADeliver),
to run this manually via Docker:

```bash
# build the docker image
$ docker build . -t the-times-pdf:latest

# run a docker container, it must be priviledged to allow Chromium to launch
$ docker run -it --privileged \
    -e TIMES_EMAIL=test@thetimes.co.uk -e TIMES_PASSWORD=s3cr3t \
    -e SLACK_CHANNEL=C123456789 -e SLACK_TOKEN=xoxb-test-12345 \
    the-times-pdf:latest

# optionally can pull/use pre-built container
$ docker pull docker.pkg.github.com/lukebrowne/the-times-pdf/the-times-pdf:latest
```

## Disclaimer

This is a personal automation, in the script I accept the terms of the download
(that it will only be used for personal purposes) on my behalf. You should read
and accept the terms of this download too prior to using the script.

The license on the repository covers the code, not the content it downloads.

The Times make it clear they will take legal action if the terms are not
followed.

## To Do 

- [X] Authenticate with The Times
- [X] Download PDF from PressReader online
- [X] Upload PDF somewhere
- [X] Send the PDF to myself
- [X] Run this every morning
- [X] Also handle supplements
