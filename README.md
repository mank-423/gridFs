# gridFs
Implmentation of GridFs for mongoDB files storage in buckets

Tutorial:
https://medium.com/@mamadouniakate382/how-to-manage-file-storage-using-gridfs-with-node-js-express-js-mongodb-mongoose-and-multer-c92add368e76

Github for the tutorial:
https://github.com/mamadou-niakate/tutorials/tree/nodejs-gridfs-tutorial

Issue of id in gridfs:
https://github.com/devconcept/multer-gridfs-storage/issues/560
- This comment fixed my issue

I just had this same issue, however Im not using Yarn.
To resolve I needed to install mongodb v5.9.1

npm install mongodb@5.9.1

This instantly fixed the issue

