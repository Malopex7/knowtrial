import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';

let bucket;

/**
 * Returns a shared GridFSBucket instance.
 * Call only after Mongoose has connected.
 */
export function getBucket() {
    if (!bucket) {
        bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
    }
    return bucket;
}
