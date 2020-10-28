# gitsz

> a more deterministic and secure source artifact creation process

- [gitsz](#gitsz)
  * [Motivation](#motivation)
    + [Replacing tarballs](#replacing-tarballs)
      - [Cannonical Git Commit](#cannonical-git-commit)
      - [Usage](#usage)
        * [generate tag](#generate-tag)
        * [verify tag](#verify-tag)
        * [git secure tag](#git-secure-tag)
    + [Reference Case Study](#reference-case-study)
  * [Implementation](#implementation)
  * [Installation](#installation)
  * [Usage](#usage-1)
  * [Implementation and Contributors](#implementation-and-contributors)
  * [License](#license)
  

## Motivation

> $GIT_TAG should be the primary artifact

With the current design, it is necessary to use Git to clone the repository and use Git to walk the trees. 
This means that Git is exposed to untrusted data before the signature is verified, making it part of the TCB (Trusted Computing Base).

>  This is not desirable because Git has a large footprint in the engineering ecosystem

At least, the recommended steps should verify the signature before a checkout is performed 
(which is probably the most risky operation because it involves partially attacker-controlled file system operations).


The point of signing a `git` commit is to authenticate history to future consumers so the fact that history was 'tampered with deliberately' 
needs to be preserved in the signature because it is possible to alter the exact semantics/content of the commit.

> `git` uses SHA-1 hashes when signing tag. SHA-1 is generally deprecated and is not a collision-safe anymore (though, ~~collisions are yet to come~~ pre-image attack is yet to come).


### Replacing tarballs 

What gitsz (i.e. git-evtag) implements is an algorithm for providing a strong checksum over the complete source objects for the target:

```diff
-commit (- trees - blobs - submodules)
+commit (+ trees + blobs + submodules)
```

Then it's integrated with GPG for end-to-end verification. (Although, one could also wrap the checksum in X.509 or some other 
public/private signature solution).

This is similar to what project distributors often accomplish by using git archive, or make dist, or similar tools to generate 
a tarball, and then checksumming that, and (ideally) providing a GPG signature covering it.

If the checksum is not reproducible, it becomes much more difficult to easily and reliably verify that a generated tarball 
contains the same source code as a particular git commit.

#### Cannonical Git Commit

```bash
$ GIT_AUTHOR_DATE="Thu, 01 Jan 1970 00:00:00 +0000" GIT_COMMITTER_DATE="Thu, 01 Jan 1970 00:00:00 +0000" git commit --allow-empty -m 'Initial commit'
```

#### Usage
 <br>
`$ gitsz `

```bash
Usage: gitsz [-s | -u <keyid>] [-m <msg>]
                      <tagname> [<commit> | <object>]

Commands:
  hash  print hash of repository contents

Options:
  -v, --verify  Verify the gpg signature of a given tag                [boolean]
  --insecure    Do not sign the tag                                    [boolean]
  -h, --help    Show help                                              [boolean]
```

##### generate tag

 <br>
```bash
$ gitsz sign v2015.10
 ( type your tag message, note a Git-EVTag-v0-SHA512 line in the message )
$ git show v2015.10
 ( Note signature covered by GPG signature )
 ```
 <br>
 
 `git secure-tag -s v2.5.0`
 
 ##### verify tag
 
 <br>
 
 ```bash
$ git secure-tag -v v2.5.0
gpg: Signature made Wed Oct 28 00:16:58 2020 PDT
gpg:                using RSA key C00B2090F23C5629029111CBF5D2A7216C51FB94
gpg: Good signature from "sam bacha <sam@freighttrust.com>" [ultimate]
gpg:                 aka "Freight Trust Corp <sam@freighttrust.com>" [ultimate]
Good Git-EVTag-v0-SHA512 hash
```
##### git secure tag 
```bash
$ gitsz hash
bdf3cd8f2a4e29a5cf86cbd7fe815583b0e78b4efe4759fc7204b5dfb6fb928fde138f7fcfcae19e241b25d210b3c3147cb7b5327654ae3dd1ae02d4908e4671
```

### Reference Case Study

[github/sambacha/BPBDTL/commit/21687a1a7d5f3c26e9c06fa23547fca4a09178a2](https://github.com/sambacha/BPBDTL/commit/21687a1a7d5f3c26e9c06fa23547fca4a09178a2)

- In this scenario, I signed a commit at approx. 0 UNIX EPOCH time using another user's credentials, and by credentials I mean just using their `email@address` and 
`user name`. No other passwords, etc, is required. Although GitHub does not say `verified` for the commit, it displays the user's avatar, and may be overlooked 
without more careful examination. 

## Implementation

`gitsz` runs `cat-file` recursively for each
entry (sorted alphabetically), enters submodules (if present), and hashes
file/directory names, file contents, and submodules (recursively again) into a
resulting `Git-EVTag-v0-SHA512: ...` SHA512 digest.

## Installation

```bash
npm install -g gitsz
```

## Usage

```bash
# Sign
gitsz v1.20.7 -m "My tag annotation"

# Verify
gitsz -v v1.20.7
```

## Implementation and Contributors

Largely inspired by:

[@gwalters/git-evtag](https://github.com/cgwalters/git-evtag)

Fedor Indutny, 2016.

## License

SPDX-License-Identifier: MIT
