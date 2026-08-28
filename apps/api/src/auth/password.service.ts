import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { Injectable } from '@nestjs/common';

const derive = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number },
) => Promise<Buffer>;

const SCHEME = 'scrypt';
const COST = 16384;
const BLOCK_SIZE = 8;
const PARALLELISM = 1;
const SALT_BYTES = 16;
const KEY_BYTES = 64;

@Injectable()
export class PasswordService {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(SALT_BYTES);
    const key = await derive(password, salt, KEY_BYTES, {
      N: COST,
      r: BLOCK_SIZE,
      p: PARALLELISM,
    });

    return [
      SCHEME,
      COST,
      BLOCK_SIZE,
      PARALLELISM,
      salt.toString('base64url'),
      key.toString('base64url'),
    ].join('$');
  }

  async verify(stored: string, password: string): Promise<boolean> {
    const parts = stored.split('$');

    if (parts.length !== 6 || parts[0] !== SCHEME) {
      return false;
    }

    const [, cost, blockSize, parallelism, salt, key] = parts as [
      string,
      string,
      string,
      string,
      string,
      string,
    ];

    const expected = Buffer.from(key, 'base64url');
    const actual = await derive(password, Buffer.from(salt, 'base64url'), expected.length, {
      N: Number(cost),
      r: Number(blockSize),
      p: Number(parallelism),
    });

    return timingSafeEqual(expected, actual);
  }
}
