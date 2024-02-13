#!/usr/bin/env node
import { makeCli } from './cli';

const cli = makeCli();
cli.parse();
