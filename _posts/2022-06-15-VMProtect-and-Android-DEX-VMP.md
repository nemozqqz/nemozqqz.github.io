---
layout: post
title: VMProtect and Android DEX-VMP
---

## Chosen-Instruction Attack 与 Android DEX-VMP

看了NDSS22的一篇关于分析VMProtect的文章 [Chosen-Instruction Attack Against Commercial Code Virtualization Obfuscators][cia]，通过构造输入加壳的程序代码，anchor指令定位加壳后的位置，比较加壳前后对应位置的代码来提取壳的虚拟化规则，重用这些规则帮助分析。 在文章的future work中作者提到Android平台的虚拟化 和 [Parema: an unpacking framework for demystifying VM-based Android packers][parema].

Android平台的虚拟化保护其实有两个层面，Java层和Native层， Native层是和VMProtect这种二进制虚拟化类似的保护， 而Java层更多是DEX-VMP，即使用自定义的Dalvik虚拟机执行转换后的字节码，从而保护DEX中的逻辑。那我来讲讲自己对VMProtect和DEX-VMP比较的一些想法。

| | **Native Virtualization** | **Android DEX-VMP** |
| **Packing Pharse** | x86 -> bytecode + handler |  Dalvik -> bytecode + interpreter  |
| **Execution Pharse** |  call vm_entry | call interpreter  |
| **Protection Level** |  x86 instruction | Java method |
| **Packing Interface**  |  local | cloud |
| **Handle Unsupport Instruction** | context switch | N/A |



## Chosen-Instruction Attack on Android DEX-VMP
和x86指令转换成调用等价语义的handler类似， DEX-VMP是将标准Dalvik指令转换
自定义格式的bytecode，在执行时用对应的解释器去执行。关键在于转换规则是在云端的加壳服务中，调用加壳服务会受到认证/次数/费用限制。同时云端的黑盒性/可更新也会导致壳版本和转换规则会很多，重用规则的范围也受到限制。

对Dalvik而言，转换规则的一大部分是对Opcode重新标号，即修改opcode映射表 (Opcode Remapping)。 这种方法在其他一些解释型的语言(Lua，Python)保护中也出现过。


在2017年有一篇博客，利用360加固提供的免费DEX-VMP默认保护所有Activity的onCreate方法的条件，构造覆盖大部分dalvik opcode的onCreate方法，来恢复360加壳服务的映射表。不过不是所有的opcode都能直接放进onCreate的，比如`return-object`. 其实可以这样构造

```
:start 
    goto :label
    nop
    const/4
    ...
    ushr-int/lit8 
:label
    return-void
```

加壳时不能确定哪些指令会被执行到，因此可以把所有opcode都塞进一个函数。优点是opcode全覆盖，缺点是不能动态trace进行分析opcode对应的handler。

## Multiple-to-One Mapping
多对一的映射是没有逆映射的。对抗vm分析的一个方法是 handler combination，把不同逻辑的handler合并到一起。Dalvik场景下天生存在两个opcode映射到同一个handler实现的情况： `long-to-int` 和 `move`

```asm
%def op_long_to_int():
/* we ignore the high word, making this equivalent to a 32-bit reg move */
%  op_move()
```
<https://android.googlesource.com/platform/art/+/refs/heads/master/runtime/interpreter/mterp/x86ng/arithmetic.S#507>

那么这样会导致还原DEX的时候出现类型的问题，类型不正确的bytecode可能会影响一些分析工具。

Dalvik指令集中还有一些operand类型不同的opcode， 例如return簇 `return`， `return-void`，`return-wide`,`return-object`， invoke簇有`invoke-virtual`,`invoke-direct`,`invoke-interface`, `invoke-static`。 这些opcode簇也有Multiple-to-One 的问题。

JNI相关的opcode也是一个问题，不像x86指令一样能进行符号化表达



## Context-sensitive Encryption
VMProtect很强的功能是在执行每个opcode前用rolling key解密， 执行完成后更新rolling key，如果rolling key的值不对下一条指令是不能正确解密的。除了实际执行/模拟每一条指令，无法一下完整获得所有的bytecode。

DEX-VMP还没有出现的类似的保护, 保护的粒度在方法级。大部分APK加固服务都没有提供接口让用户决定保护哪些方法，只有360提供了`@QVMProtect`注解来实现用户自定义。360对不同方法使用不同的密钥， 其他厂商有使用自定义常量索引，三字节对齐等变换指令格式的方法。


DEX-VMP需要支持218条DEX035 opcode， 不存在不能支持的指令需要context switch的情况。


## Dispatcher & Handler Implementation
AOSP中的Dalvik解释器有switch版本和threaded goto版本， threaded execution 更难恢复控制流和定位handler。

x86的handler只要语义等价，handler实现方法有多种；DEX-VMP的 JNI相关的handler无法自由实现，绕不开JNIInterface中的各种函数。

## Epilogue
放一些DEX-VMP加固和还原的图

![bangcle-vmp](/assets/bangcle-vmp.png)

![360-vmp](/assets/360-vmp.png) 360加固你要位置信息干什么！

![ijm-vmp](/assets/ijm-vmp.png)

## Reference

[cia]: https://www.ndss-symposium.org/wp-content/uploads/2022-15-paper.pdf "CIA"
[parema]: https://www4.comp.polyu.edu.hk/~csxluo/Parema.pdf 
* <https://4hou.win/wordpress/?author=682> 针对360加固构造onCreate
* <https://geneblue.github.io/2019/09/13/android/sec--android-dex-vmp/>  DEX-VMP 设计与实现
* <https://medium.com/tenable-techblog/remapping-python-opcodes-67d79586bfd5> Python opcode remapping
* <https://synthesis.to/presentations/recon22_next_gen.pdf> 思路也是合并handler
