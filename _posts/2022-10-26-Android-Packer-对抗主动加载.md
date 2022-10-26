---
layout: post
title: Android Packer对抗主动加载的一种方法
---


一句话概括： 在DEX中插入无用类，检测到无用类的加载后随机kill自己

在用FART脱壳时经常出现方法没枚举完App就crash的情况，因此开始本次的分析。 某加固的指令抽取是通过hook classlinker的LoadMethod方法来实现的，codeitem的debug offset被壳用来做方法索引。

![LoadMethod](/assets/ijm_anti_enumeration/0.png)

可以看到根据系统不同版本拼接需要hook 的LoadMethod方法签名

![OrigialMethod](/assets/ijm_anti_enumeration/1.png)

原始LoadMethod方法执行完后进入壳自己的LoadMethod

![mprotect](/assets/ijm_anti_enumeration/2.png)

在壳合法的debugInfoOffset范围内，用mprotect修改insns页面权限

![decryptinsn](/assets/ijm_anti_enumeration/3.png)

insns解密前会先比较debug info offset是否在黑名单中，每次解密都需要满足计数器`dword_C00DC`的值小于`dword_C00EC`


![cmpdebuginfo](/assets/ijm_anti_enumeration/4.png)

比较debug info是否匹配黑名单，有匹配的话 计数器`dword_C00DC`从零置为1

![initdebuginfo](/assets/ijm_anti_enumeration/5.png)

保存debug info黑名单的地方

![counterwatcher](/assets/ijm_anti_enumeration/6.png)

有一个线程会监控计数器`dword_C00DC`的值，如果计数器大于`dword_C00EC`就会kill self

![dexhunter1](/assets/ijm_anti_enumeration/7.png)
![dexhunter2](/assets/ijm_anti_enumeration/8.png)

在检测到DexHunter/FUPK 的特征导出函数时也会给计数器置1

![initcounter](/assets/ijm_anti_enumeration/9.png)

计数器和上限初始化的地方，可以看到上限`dword_C00EC`是随机的。

总结： 在DEX中插入无用类，记录这些类的debug info offset作为黑名单；正常运行时不会加载这些无用类（没有任何引用），而当FART进行枚举方法主动调用时，会触发这些类的加载，从而导致计数器置1。计数器递增到达上限后触发kill self，App表现为随机的crash，从而中断枚举过程。

如何反制这种对抗：

* hook kill，在这个例子里计数器到达上限后就不再解密指令了，hook kill阻止了崩溃但是也继续无法dump
* 使黑名单无效，比如hook 这个例子里的atoi返回值 : 需要在壳运行前hook atoi
* crash后跳过之前的类继续dump: 需要记录dump进度




