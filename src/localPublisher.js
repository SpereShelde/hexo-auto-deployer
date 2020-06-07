const fs = require('fs');
const child_process = require('child_process');

class LocalPublisher {
  constructor(config) {
    this.blogs = config.blogs
  }

  getTime() {
    const now = new Date();
    return `${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
  }

  start() {
    this.blogs.forEach((blog) => {
      this.check(blog);
    })
  }

  check(blog) {
    let wait = false;
    fs.watch(blog.localPostsPath, (event, filename) => {
      if (filename) {
        if (wait) return;
        wait = setTimeout(() => {
          wait = false;
          console.log(`${filename} file Changed`);
          child_process.exec('hexo d -g', {
            cwd: blog.blogPath,	// switch working directory
          }, (err) => {
            if(err) {
              console.log(`${this.getTime()}: Blog at ${blog.blogPath} cannot get deployed. Try again next time.`)
            } else {
              console.log(`${this.getTime()}: Blog at ${blog.blogPath} re-deployed.`)
            }
          })
        }, 200);
      }
    });
  }
}

module.exports = LocalPublisher;