## 定义和索引仍然不太准确

```html
<div data-v-319605d1="" class="wiki-hover-card wiki-hover-card-locked" style="left: 804.5px; top: 791.719px; position: fixed; z-index: 3006;"><header data-v-319605d1="" class="wiki-hover-card-header"><h3 data-v-8d33f612="" class="wiki-hover-title">力量加成</h3><button data-v-8d33f612="" class="wiki-hover-card-close">×</button></header><section data-v-319605d1="" class="wiki-hover-card-content"><div data-v-590fa387="" data-v-8d33f612="" class="wiki-definition wiki-definition-item"><div data-v-590fa387="" class="wiki-definition-source"> 来自 <span data-v-8d33f612="" class="wiki-file-link">/examples/</span> 的定义 <!--v-if--></div><div data-v-590fa387="" class="wiki-definition-text"><div data-v-04663bac="" data-v-8d33f612="" class="wiki-definition-content"><span data-v-04663bac="">设计值，力量属性对攻击力的加成比例</span></div></div><footer data-v-590fa387="" class="wiki-definition-meta"></footer></div><div data-v-590fa387="" data-v-8d33f612="" class="wiki-definition wiki-definition-item" data-wiki-id="term_dtqd8q"><div data-v-590fa387="" class="wiki-definition-source"> 来自 <span data-v-8d33f612="" class="wiki-file-link">README</span> 的定义 <span data-v-8d33f612="" class="wiki-scope-badge">examples</span></div><div data-v-590fa387="" class="wiki-definition-text"><div data-v-04663bac="" data-v-8d33f612="" class="wiki-definition-content"><span data-v-04663bac="">设计值，力量属性对攻击力的加成比例</span></div></div><footer data-v-590fa387="" class="wiki-definition-meta"><span data-v-8d33f612="">第 34 行</span></footer></div></section></div>
```

这是对于 内联定义 【力量加成】 的定义卡片。它存在以下问题：
1. 重复显示，它显示了两遍，一次是来自 /examples/ 的定义，一次是来自 README 的定义。
2. 无法跳转，点击 `/examples/` 后，跳转到 `http://localhost:8080/examples/.html`  点击 `README` 后，跳转到 `http://localhost:8080/examples/README.html?id=term_dtqd8q` 并且显示 404 错误


## 没有显示词条的相关公式

如题，没有显示词条的相关公式。

## 模板功能未能实现

【{小明}向{小红}释放技能】 应该匹配
【{A}向{B}释放技能】：模板，用于描述角色之间的技能释放关系，{A}和{B}是占位符，表示任意角色。的定义，并且按照v2中的，将 {A} {B} 实际的值替换为 小明 和 小红。

## 单文件词条热更新

文件修改后，检查它当前或者之前是否是 单文件 词条定义(设置了 alias)，如果是：
从索引中将之前的状态同步为现在的状态。