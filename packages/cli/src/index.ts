#!/usr/bin/env node
import dotenv from 'dotenv';
import { makeCli } from './cli';

dotenv.config();
const cli = makeCli();
cli.parse();
