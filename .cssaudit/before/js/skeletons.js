/* ============ Starter templates ============
   One small program per language: the boilerplate needed to read standard input, and nothing about any
   particular question. The question's own Input / Output section says what to read and print, so the same
   template serves every question. Keys are Wandbox language names (js/wandbox.js lists them live).
   `npm run wandbox:smoke` compiles every template on the real Wandbox, so a template that stops working shows up. */
const Skeletons = (() => {
  const T = {
    C: ['c', `#include <stdio.h>
#include <stdlib.h>

int main(void) {
    /* Read the input with scanf / getchar, then print the answer with printf. */
    return 0;
}
`],
    'C++': ['cpp', `#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <map>
#include <set>
#include <queue>
#include <unordered_map>
#include <unordered_set>
#include <climits>
#include <cmath>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    // Read the input from cin, print the answer to cout.
    return 0;
}
`],
    'C#': ['cs', `using System;
using System.Collections.Generic;
using System.Linq;

class Program {
    static void Main() {
        // Read the input with Console.ReadLine() / Console.In.ReadToEnd(), print with Console.WriteLine.
    }
}
`],
    Java: ['java', `import java.util.*;

class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        // Read the input from in, print the answer with System.out.println.
    }
}
`],
    Python: ['py', `import sys

def main():
    data = sys.stdin.read().split("\\n")
    # Parse the input from data, then print the answer.

main()
`],
    JavaScript: ['js', `// Runs in your browser (instant) or on Node.js. Read the input, print the answer.
const lines = require('fs').readFileSync(0, 'utf8').split('\\n');

// Parse the input from lines, then console.log the answer.
`],
    TypeScript: ['ts', `declare const require: any;
const lines: string[] = require('fs').readFileSync(0, 'utf8').split('\\n');

// Parse the input from lines, then console.log the answer.
`],
    Go: ['go', `package main

import (
	"bufio"
	"fmt"
	"os"
)

func main() {
	in := bufio.NewReader(os.Stdin)
	out := bufio.NewWriter(os.Stdout)
	defer out.Flush()
	// Read the input with fmt.Fscan(in, &x), print the answer with fmt.Fprintln(out, ...).
	_ = in
	_ = fmt.Sprint
}
`],
    Rust: ['rs', `use std::io::{self, Read};

fn main() {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input).unwrap();
    // Parse the input from \`input\`, then println! the answer.
}
`],
    Ruby: ['rb', `input = STDIN.read.split("\\n")
# Parse the input from input, then puts the answer.
`],
    Swift: ['swift', `import Foundation

// Read the input with readLine(), print the answer with print(...).
`],
    PHP: ['php', `<?php
$lines = explode("\\n", stream_get_contents(STDIN));
// Parse the input from $lines, then echo the answer.
`],
    Lua: ['lua', `-- Read the input with io.read, print the answer with print.
`],
    Perl: ['pl', `use strict; use warnings;
my @lines = <STDIN>;
# Parse the input from @lines, then print the answer.
`],
    Haskell: ['hs', `main :: IO ()
main = do
  input <- getContents
  -- Parse the input from \`input\`, then putStrLn the answer.
  return ()
`],
    Scala: ['scala', `import scala.io.StdIn

object Main {
  def main(args: Array[String]): Unit = {
    // Read the input with StdIn.readLine(), print the answer with println.
  }
}
`],
    Groovy: ['groovy', `def lines = System.in.text.split("\\n")
// Parse the input from lines, then println the answer.
`],
    D: ['d', `import std.stdio;

void main() {
    // Read the input with readln() / readf, print the answer with writeln.
}
`],
    Erlang: ['erl', `-module(prog).
-export([main/0, main/1]).

main() -> main([]).

main(_) ->
    %% Read the input with io:get_line / io:fread, print the answer with io:format.
    ok.
`],
    Elixir: ['exs', `input = IO.read(:stdio, :eof)
# Parse the input from input, then IO.puts the answer.
_ = input
`],
    Pascal: ['pas', `program Main;
begin
  { Read the input with readln, print the answer with writeln. }
end.
`],
    Lisp: ['lisp', `;; Read the input with (read) / (read-line), print the answer with (format t ...).
`],
    OCaml: ['ml', `let () =
  (* Read the input with Scanf.scanf or input_line stdin, print the answer with Printf.printf. *)
  ()
`],
    'Bash script': ['sh', `#!/bin/bash
# Read the input with read, print the answer with echo.
`],
    Pony: ['pony', `actor Main
  new create(env: Env) =>
    // Read the input from env.input, print the answer with env.out.print.
    None
`],
    Crystal: ['cr', `# Read the input with gets, print the answer with puts.
`],
    Nim: ['nim', `# Read the input with readLine(stdin), print the answer with echo.
`],
    R: ['r', `con <- file("stdin")
lines <- readLines(con)
close(con)
# Parse the input from lines, then cat / print the answer.
`],
    Julia: ['jl', `# Read the input with readline() / readlines(), print the answer with println.
`],
    Zig: ['zig', `const std = @import("std");

pub fn main() !void {
    // Read the input from std.io.getStdIn().reader(), print the answer with std.io.getStdOut().writer().
}
`]
  };

  /** The starter template for a Wandbox language: { code, ext }. Unknown languages get an empty one. */
  function forLanguage(language) {
    const t = T[language];
    return t ? { code: t[1], ext: t[0] } : { code: '', ext: 'txt' };
  }

  return { for: forLanguage, languages: () => Object.keys(T) };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Skeletons;
