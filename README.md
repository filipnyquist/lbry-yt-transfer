# Lbry Youtube Transferer
This is a custom made software created to help with the mirroring of a youtube channel to [LBRY](https://lbry.io/)!

  - It downloads all the youtube videos from a channel
  - Saves down the metadata and thumbnails
  - Uploads the videos to lbry
### Installation(ubuntu/debian based)

This tool needs [Node.js](https://nodejs.org/) v6+ to run.

Install Node.js and NPM if it isn´t installed.

```sh
$ cd ~
$ curl -sL https://deb.nodesource.com/setup_6.x -o nodesource_setup.sh
$ sudo bash nodesource_setup.sh
$ sudo npm install -g npm
```

Install dependencies to be able to build all modules..

```sh
$ sudo apt-get update
$ sudo apt-get install build-essential libssl-dev
```
Clone the repo and install the modules...
```sh
$ git clone https://github.com/filipnyquist/lbry-yt-transfer
$ cd lbry-yt-transfer
$ npm install
```

More stuff to be added....
