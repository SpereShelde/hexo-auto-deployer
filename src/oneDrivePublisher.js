const fs = require('fs');
const stream = require('stream');
const path = require('path');
const child_process = require('child_process');
const { promisify } = require('util');
const got = require('got');

const pipeline = promisify(stream.pipeline);
const exec = promisify(child_process.exec);

class OneDriveTool {
  constructor(config) {
    this.config = config;
    this.retried = 0;
  }

  async post(url, data) {
    return got(url, {
      method: 'POST',
      form: data,
      responseType: 'json'
    });
  }

  async login() {
    try {
      const {body} = await this.post('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        client_id: this.config.client_id,
        redirect_uri: this.config.redirect_uri,
        client_secret: this.config.client_secret,
        code: this.config.code,
        grant_type: "authorization_code"
      })
      const now = new Date();
      console.log(`${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}: Login success`)
      this.expires_in = body.expires_in*1000;
      this.access_token = body.access_token;
      this.refresh_token = body.refresh_token;
      setTimeout(() => {
        this.refresh();
      }, this.expires_in - 600000);
    } catch (e) {
      console.log('Login error. Please check code value in config.js.')
      process.exit(0)
    }
  }

  async refresh() {
    try {
      const {body} = await this.post('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        client_id: this.config.client_id,
        redirect_uri: this.config.redirect_uri,
        client_secret: this.config.client_secret,
        refresh_token: this.refresh_token,
        grant_type: "refresh_token"
      })
      const now = new Date();
      console.log(`${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}: Token refresh success`)
      this.retried = 0;
      this.expires_in = body.expires_in*1000;
      this.access_token = body.access_token;
      this.refresh_token = body.refresh_token;
      setTimeout(() => {
        this.refresh();
      }, this.expires_in - 600000);
    } catch (e) {
      if (this.retried < 5) {
        this.retried += 1;
        console.log(`${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}: Token refresh error. ${this.retried}th attempt. Retry in 1 minute`)
        setTimeout(() => {
          this.refresh();
        }, 60000);
      } else {

      }
    }
  }

  async getRemoteFiles(path) {
    return got(`https://graph.microsoft.com/v1.0/me/drive/root:/${path}:/children`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.access_token}`
      },
      responseType: 'json'
    });
  }
}

class OneDrivePublisher {

  constructor(config) {
    this.oneDrive = new OneDriveTool(config);
    this.blogs = config.blogs;
  }

  getTime() {
    const now = new Date();
    return `${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
  }

  async start() {
    await this.oneDrive.login();
    this.blogs.forEach((blog) => {
      setInterval(async () => {
        this.deploy(blog).then(() => {
          console.log(`${this.getTime()}: Blog at ${blog.blogPath} re-deployed.`)
        }, () => {})
          .catch(() => {
          console.log(`${this.getTime()}: Blog at ${blog.blogPath} cannot get deployed. Retry in ${blog.cycle} seconds.`)
        })
      }, blog.cycle * 1000);
      this.deploy(blog).then(() => {
        console.log(`${this.getTime()}: Blog at ${blog.blogPath} re-deployed.`)
      }, () => {})
        .catch(() => {
        console.log(`${this.getTime()}: Blog at ${blog.blogPath} cannot get deployed. Retry in ${blog.cycle} seconds.`)
      })
    })
  }

  async deploy(blog) {
    const needDeploy = await this.check(blog);
    if (needDeploy) {
      console.log(`${this.getTime()}: Files in ${blog.localPostsPath} changed. Now re-deploy.`);
      return exec('hexo d -g', {
        cwd: blog.blogPath,
      })
    } else {
      return Promise.reject('No change');
    }
  }

  async check(blog) {
    const localFiles = await this.getLocalFiles(blog.localPostsPath);
    const remoteFiles = await this.getRemoteFiles(blog.remotePostsPath);
    // console.log(`${this.getTime()}: Get ${remoteFiles.size} remote files and ${localFiles.size} local files`);
    let needDeploy = false;
    const promises = [];
    for (const rFile of remoteFiles.entries()) {
      if (localFiles.has(rFile[0])) {
        if (localFiles.get(rFile[0]) < Date.parse(rFile[1].mtime)) {
          needDeploy = true;
          console.log(`\tDownload ${rFile[0]} - overwrite`);
          promises.push(this.downloadFile(rFile[1].link, path.resolve(blog.localPostsPath, rFile[0])));
        }
      } else {
        needDeploy = true;
        console.log(`\tDownload ${rFile[0]}`);
        promises.push(this.downloadFile(rFile[1].link, path.resolve(blog.localPostsPath, rFile[0])));
      }
    }
    for (const lFile of localFiles.entries()) {
      if (!remoteFiles.has(lFile[0])) {
        needDeploy = true;
        console.log(`\tRemove ${lFile[0]}`);
        promises.push(this.removeFile(path.resolve(blog.localPostsPath, lFile[0])));
      }
    }
    await Promise.allSettled(promises);
    return needDeploy;
  }

  async getRemoteFiles(path) {
    if (path.startsWith('/')) {
      path = path.substring(1, path.length);
    }
    if (path.endsWith('/')) {
      path = path.substring(0, path.length-1);
    }
    const {body} = await this.oneDrive.getRemoteFiles(path);
    const {value: files} = body; // value is an array of files within current directory
    const articles = new Map();
    files.forEach((file) => {
      articles.set(file.name, {
        mtime: file.lastModifiedDateTime,
        link: file['@microsoft.graph.downloadUrl'],
      });
    })
    return articles;
  }

  async getLocalFiles(path) {
    if (!path.endsWith('/')) {
      path = path + '/';
    }
    const fileNames = fs.readdirSync(path);
    const files = new Map();
    fileNames.forEach((fileName) => {
      const fileStat = fs.statSync(path + fileName);
      files.set(fileName, fileStat.mtime);
    })
    return files;
  }

  async downloadFile(link, fullName) {
    return pipeline(
      got.stream(link),
      fs.createWriteStream(fullName)
    );
  }

  async removeFile(fullName) {
    return exec(`rm -rf ${fullName}`)
  }
}

module.exports = OneDrivePublisher;