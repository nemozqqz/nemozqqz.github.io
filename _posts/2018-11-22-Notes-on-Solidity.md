---
layout:default
title: Notes on Solidity
---
# Notes on Solidity
## require VS assert

两者都在断言不满足的时候失败然后回滚，require比较友好，会退回剩余gas， assert会吃掉剩余gas。
require handles acceptable error, while assert means sth out of control.

## transfer VS send VS call
三种不同层次的合约间调用。

* transfer: value, no data; 2300 gas(fixed), revert if fails // 2300gas is not enough for changing storage or init another call
* send: value,no data;2300 gas(fixed), return 0 if fails
* call: value&data; forward all gas by default(adjustable);return 0 if fails

如果直接调用合约的函数的话，默认是给所有的gas。其实大部分函数都能重入

区分 `address.transfer` 和 `contract.transfer`，contract可能有一个叫`transfer`的函数。

## call
区分solidity的call和EVM的call
```
call(gas, to ,value, input memory offset, output memory offset, output size)
```
calculating gas of a call is complex, see EIP150 （63/64?)

call(msg.gas- 2000,…) // call with some gas spared

## memory/storage layout of array and map

* 定长数组: 原地展开
* 动态数组: length stored at slot, arr[idx] is stored at sha3(bytes32(slot)) + idx* sizeof(arr[0])
* mapping: map[key] is stored at sha3(byte32(key) || bytes32(slot))

arbitary write if index of array is controled??? Rewrite map values???
## delete
delete in solidity sets storage/memory to zero, and refund gas

## revert

revert会回滚当前call和它的subcall。正常函数调用的话，一级一级传递revert；但是call不会传递revert，return 0

A reentrancy honey pot。 ether发出去也是可以挽回的。。。
```solidity
function f()public{
    if (msg.sender.call.value(1 ether){
        sth reverts
    }
}
```

All the inner calls reverts, except the outest(first) call,which just returns.

## Class
constructor must be public or internal. A class’s constructor can be only used by it’s parent class, thus internal.

构造函数的return是runtime code, 使用return opcode可以在构造时强行逆天改命，而且etherscan 只verify了constructor code
multi inheritance. Order matters

## Balance
增加余额的几种方法

* transfer()， fallback()
* selfdesturct
* mining address

## EOA or Contract

* msg.sender == origin. delegatecall不能绕过，delegatecall只是重用了代码，修改的是自己的存储
* extcodesize == 0. 在构造函数中extcodesize=0 绕过
* 提供v,r,s签名， ecrecover == msg.sender. 合约是没有私钥的. 使用ecrecover一定要hash, 没有hash的话ECDSA可以[伪造合法的签名](http://www.metzdowd.com/pipermail/cryptography/2017-March/031755.html)，但是不能控制任意的签名内容

## Solidity 0.5 updates

* 强制写函数可见性
* no var, js scope -> C scope
* address(contract).transfer
* call(signature, a, b, c) -> call(abi.encodeWithSignature(signature, a, b, c))
* keccak256(a, b, c) to keccak256(abi.encodePacked(a, b, c))
