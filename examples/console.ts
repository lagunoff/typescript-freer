import { Eff, Pure, Chain, toEffBase } from '../src/index';
import { ensure } from '../src/types';
import { Subscribe, Async } from '../src/async';


export type Console = PutStrLn|GetLine;


function putStrLn(line: string): Eff<Console, void> {
  return new PutStrLn(line);
}

function getLine(): Eff<Console, string> {
  return new GetLine('');
}

function question(question: string): Eff<Console, string> {
  return new GetLine(question);
}

export function runConsoleGeneric(
  putStrLn_: (x: string) => Subscribe<void>,
  getLine_: (question: string) => Subscribe<string>,
): <U, A>(effect: Eff<U, A>) => Eff<Exclude<U, Console>|Async, A> {  
  return <U, A>(effect: Eff<U, A>) => {
    if (effect instanceof Pure) {
      return effect.castU();
    }
    
    if (effect instanceof Chain) {
      const first = runConsoleGeneric(putStrLn_, getLine_)(effect._first);
      return toEffBase(first).chain(a => runConsoleGeneric(putStrLn_, getLine_)(effect._then(a)));
    }

    if (effect instanceof PutStrLn) {
      return Async.create(putStrLn_(effect._line));
    }
    
    if (effect instanceof GetLine) {
      return Async.create(getLine_(effect._question));
    }

    ensure<U>(effect);
    return effect as any;
  };
}

export const runConsole = function() {
  if (typeof prompt !== 'undefined') {
    // In-browser implementation
    return runConsoleGeneric(
      line => Subscribe.lazy(console.log, line),
      q => Subscribe.lazy(() => prompt(q, '')!),
    );
  } else {
    const readline = require('readline');
    const stdio = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    // Readline implementation
    return runConsoleGeneric(
      line => Subscribe.lazy(console.log, line),
      question => (next, complete) => {
        stdio.question(question, answer => {
          next(answer);
          complete();
        });
        return noopFunc;
      },
    );
  }
}();


export interface Statics {
  putStrLn: typeof putStrLn;
  getLine: typeof getLine;
  question: typeof question;
  runConsoleGeneric: typeof runConsoleGeneric;
  runConsole: typeof runConsole;
}

export const Console = {
  putStrLn, getLine, question, runConsole, runConsoleGeneric
} as Statics;


export class PutStrLn {
  readonly _A: void;
  constructor(
    readonly _line: string,
  ) {}
}

export class GetLine {
  readonly _A: string;
  constructor(
    readonly _question: string,
  ) {}  
}

function noopFunc() {}

declare var process: {
  exit(status: number): void;
  stdin: any;
  stdout: any;
};

declare var require: Function;
