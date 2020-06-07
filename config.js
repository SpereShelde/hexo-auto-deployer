module.exports = {
  // method only support "oneDrive" or "local"
  method: "oneDrive",
  oneDrive: {
    redirect_uri: "http://localhost/onedrive-login",
    client_id: "c7596fb8-beee-4b96-ac86-5277779f4820",
    client_secret: "M0~TSr5~qn9wD7f2UFS-j2UBO7~eQg71CK",
    // Every time you run this tool, you need visit the link below to get the code.
    // https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=c7596fb8-beee-4b96-ac86-5277779f4820&response_type=code&scope=offline_access+files.readwrite+files.read+files.read.all+files.readwrite.all&redirect_uri=http://localhost/onedrive-login
    code: "",
    blogs: [
      {
        blogPath: "/www/hexo/blog",
        localPostsPath: "/www/hexo/blog/source/_posts",
        remotePostsPath: "/Blog/articles/English",
        cycle: 120, // seconds
      },
      // You can add more than one blog.
      // {
      //   blogPath: "/www/hexo/zhblog",
      //   localPostsPath: "/www/hexo/zhblog/source/_posts",
      //   remotePostsPath: "/Blog/articles/Chinese",
      //   cycle: 120,
      // }
    ]
  },
  local: {
    blogs: [
      {
        blogPath: "/www/hexo/blog",
        localPostsPath: "/www/hexo/blog/source/_posts",
      },
      // You can add more than one blog.
      // {
      //   blogPath: "/www/hexo/zhblog",
      //   localPostsPath: "/www/hexo/zhblog/source/_posts",
      // }
    ]
  }
}