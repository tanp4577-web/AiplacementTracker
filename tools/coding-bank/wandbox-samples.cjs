/* One complete "read n, then n integers on the next line, print their sum" program per Wandbox language.
   `npm run wandbox:smoke` sends each of them to the real Wandbox with the language's default compiler and
   checks the output, so the starter templates in js/skeletons.js are known to be valid on the live service.
   Input "3\n1 2 3\n" must print 6. */
module.exports = {
  C: `#include <stdio.h>
int main(void) {
    int n, s = 0, x;
    scanf("%d", &n);
    while (n-- > 0 && scanf("%d", &x) == 1) s += x;
    printf("%d\\n", s);
    return 0;
}
`,
  'C++': `#include <iostream>
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
    int n; cin >> n;
    long long s = 0, x;
    while (n-- > 0 && cin >> x) s += x;
    cout << s << "\\n";
    return 0;
}
`,
  'C#': `using System;
using System.Linq;
class Program {
    static void Main() {
        string[] t = Console.In.ReadToEnd().Split(new[] { ' ', '\\n', '\\r' }, StringSplitOptions.RemoveEmptyEntries);
        int n = int.Parse(t[0]);
        long s = 0;
        for (int i = 1; i <= n; i++) s += long.Parse(t[i]);
        Console.WriteLine(s);
    }
}
`,
  Erlang: `-module(prog).
-export([main/0, main/1]).
main() -> main([]).
main(_) ->
    {ok, [_N]} = io:fread("", "~d"),
    S = sum(0),
    io:format("~p~n", [S]).
sum(Acc) ->
    case io:fread("", "~d") of
        {ok, [X]} -> sum(Acc + X);
        _ -> Acc
    end.
`,
  Elixir: `[_n | rest] = IO.read(:stdio, :eof) |> String.split() |> Enum.map(&String.to_integer/1)
IO.puts(Enum.sum(rest))
`,
  Haskell: `main :: IO ()
main = do
  input <- getContents
  let (_ : xs) = map read (words input) :: [Int]
  print (sum xs)
`,
  D: `import std.stdio;
void main() {
    int n;
    readf(" %d", n);
    long s = 0;
    foreach (i; 0 .. n) { long x; readf(" %d", x); s += x; }
    writeln(s);
}
`,
  Java: `import java.util.*;
class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
        long s = 0;
        for (int i = 0; i < n; i++) s += in.nextLong();
        System.out.println(s);
    }
}
`,
  Rust: `use std::io::{self, Read};
fn main() {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input).unwrap();
    let mut it = input.split_whitespace();
    let n: usize = it.next().unwrap().parse().unwrap();
    let s: i64 = it.take(n).map(|x| x.parse::<i64>().unwrap()).sum();
    println!("{}", s);
}
`,
  Python: `import sys
data = sys.stdin.read().split()
n = int(data[0])
print(sum(int(x) for x in data[1:1 + n]))
`,
  Ruby: `input = STDIN.read.split.map(&:to_i)
puts input[1, input[0]].sum
`,
  Scala: `import scala.io.StdIn
object Main {
  def main(args: Array[String]): Unit = {
    val n = StdIn.readInt()
    val xs = StdIn.readLine().trim.split("\\\\s+").filter(_.nonEmpty).map(_.toLong)
    println(xs.take(n).sum)
  }
}
`,
  Groovy: `def t = System.in.text.split(/\\s+/).findAll { it }.collect { it as long }
println t[1..t[0]].sum()
`,
  JavaScript: `const t = require('fs').readFileSync(0, 'utf8').split(/\\s+/).filter(Boolean).map(Number);
console.log(t.slice(1, 1 + t[0]).reduce((a, b) => a + b, 0));
`,
  TypeScript: `declare const require: any;
const t: number[] = require('fs').readFileSync(0, 'utf8').split(/\\s+/).filter(Boolean).map(Number);
console.log(t.slice(1, 1 + t[0]).reduce((a: number, b: number) => a + b, 0));
`,
  Swift: `import Foundation
var tokens: [Int] = []
while let line = readLine() { tokens += line.split(separator: " ").compactMap { Int($0) } }
print(tokens.dropFirst().prefix(tokens[0]).reduce(0, +))
`,
  Perl: `use strict; use warnings;
local $/;
my @t = split ' ', <STDIN>;
my $n = shift @t;
my $s = 0;
$s += $_ for @t[0 .. $n - 1];
print "$s\\n";
`,
  PHP: `<?php
$t = preg_split('/\\s+/', trim(stream_get_contents(STDIN)));
$n = (int)$t[0];
$s = 0;
for ($i = 1; $i <= $n; $i++) $s += (int)$t[$i];
echo $s, "\\n";
`,
  Lua: `local n = io.read("n")
local s = 0
for _ = 1, n do s = s + io.read("n") end
print(s)
`,
  Pascal: `program Main;
var n, i, x: longint; s: int64;
begin
  readln(n);
  s := 0;
  for i := 1 to n do begin read(x); s := s + x; end;
  writeln(s);
end.
`,
  Lisp: `(let* ((n (read)) (s 0))
  (dotimes (i n) (incf s (read)))
  (format t "~a~%" s))
`,
  OCaml: `let () =
  let n = Scanf.scanf " %d" (fun x -> x) in
  let s = ref 0 in
  for _ = 1 to n do s := !s + Scanf.scanf " %d" (fun x -> x) done;
  Printf.printf "%d\\n" !s
`,
  Go: `package main

import (
	"bufio"
	"fmt"
	"os"
)

func main() {
	in := bufio.NewReader(os.Stdin)
	var n int
	fmt.Fscan(in, &n)
	s := 0
	for i := 0; i < n; i++ {
		var x int
		fmt.Fscan(in, &x)
		s += x
	}
	fmt.Println(s)
}
`,
  'Bash script': `read n
read -a xs
s=0
for x in "\${xs[@]:0:n}"; do s=$((s + x)); done
echo $s
`,
  Pony: `use "collections"
actor Main
  new create(env: Env) =>
    env.input(
      object iso is InputNotify
        let _env: Env = env
        var _buf: String ref = String
        fun ref apply(data: Array[U8] iso) => _buf.append(consume data)
        fun ref dispose() =>
          let parts = _buf.split()
          var s: I64 = 0
          try
            let n = parts(0)?.i64()?
            var i: I64 = 1
            while i <= n do s = s + parts(i.usize())?.i64()?; i = i + 1 end
          end
          _env.out.print(s.string())
      end,
      1024)
`,
  Crystal: `n = gets.not_nil!.to_i
puts gets.not_nil!.split.first(n).map(&.to_i64).sum
`,
  Nim: `import strutils
let n = parseInt(readLine(stdin))
var s = 0
for x in readLine(stdin).splitWhitespace():
  s += parseInt(x)
echo s
`,
  R: `con <- file("stdin")
t <- scan(con, quiet = TRUE)
cat(sum(t[2:(1 + t[1])]), "\\n", sep = "")
`,
  Julia: `n = parse(Int, readline())
println(sum(parse.(Int, split(readline()))[1:n]))
`,
  Zig: `const std = @import("std");
pub fn main() !void {
    const stdin = std.io.getStdIn().reader();
    var buf: [1 << 16]u8 = undefined;
    const n_line = (try stdin.readUntilDelimiterOrEof(&buf, '\\n')) orelse return;
    const n = try std.fmt.parseInt(usize, std.mem.trim(u8, n_line, " \\r"), 10);
    _ = n;
    const line = (try stdin.readUntilDelimiterOrEof(&buf, '\\n')) orelse return;
    var it = std.mem.tokenizeAny(u8, line, " \\r");
    var s: i64 = 0;
    while (it.next()) |tok| s += try std.fmt.parseInt(i64, tok, 10);
    try std.io.getStdOut().writer().print("{d}\\n", .{s});
}
`
};
