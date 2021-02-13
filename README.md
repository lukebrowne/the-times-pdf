# the-times-pdf

I can't read an e-Paper version of The Times on iOS anymore (previously was
using [PressReader](https://pressreader.com) but they've removed their
unoffical support for The Times subscriptions and is not available to buy in
the app). However the PressReader content is still available on web and
available to download as a PDF. I want to fix this by sending myself the PDF of
the paper every morning 📰

This currently downloads the latest version of The Times/The Sunday Times as a
PDF. Soon to upload somewhere and email a link.

```bash
# build the docker image
$ docker build . -t the-times-pdf

# run a docker container, it must be priviledged to allow Chromium to launch
$ docker run -it --privileged \
    -e TIMES_EMAIL=test@times.com -e TIMES_PASSWORD=s3cr3t \
    -v ~/Downloads:/tmp/the-times-downloads \
    the-times-pdf
```

## To Do 

- [X] Authenticate with The Times
- [X] Download PDF from PressReader online
- [ ] Upload PDF somewhere
- [ ] Email the link to myself
- [ ] Run this every morning
- [ ] Also handle supplements? (strech)
