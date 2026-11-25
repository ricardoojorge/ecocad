# EcoCAD 3D — programa para Windows com atualização online

## Como funciona

- `docs/index.html` é o EcoCAD. O GitHub Pages publica esse arquivo num endereço na internet.
- O instalador (`EcoCAD-3D-Setup-x.y.z.exe`) é instalado **uma vez só**. Cada vez que o programa abre, ele busca a versão mais nova de `docs/index.html` e guarda uma cópia. Sem internet, abre a última cópia baixada.
- **Para atualizar o EcoCAD basta trocar `docs/index.html`.** Ninguém precisa reinstalar nada.
- O instalador só precisa ser gerado de novo se a própria "casca" mudar, o que é raro. Mesmo assim, o programa instalado se atualiza sozinho em segundo plano.

## Primeira vez (uns 15 minutos)

1. **Crie a conta** em https://github.com (grátis).
2. **Crie o repositório:** botão **New**, nome `ecocad`, marque **Public** e clique em **Create repository**.
   - Com conta grátis, o GitHub Pages só funciona em repositório público. Isso deixa o código e o instalador visíveis para quem tiver o endereço.
3. **Envie os arquivos:** na página do repositório, clique em **uploading an existing file**. Arraste **todo o conteúdo** desta pasta: `docs`, `desktop`, `.github` e `LEIA-ME.md`. Depois clique em **Commit changes**.
   - Se a pasta `.github` não for enviada (pastas que começam com ponto às vezes ficam escondidas), faça assim: **Add file › Create new file**, digite o nome `.github/workflows/instalador-windows.yml`, cole o conteúdo desse arquivo e clique em **Commit**.
4. **Ligue o endereço do EcoCAD:** **Settings › Pages**. Em *Source*, escolha **Deploy from a branch**, depois a branch **main** e a pasta **/docs**, e clique em **Save**.
   - Em 1 ou 2 minutos o EcoCAD abre em `https://SEU-USUARIO.github.io/ecocad/`.
5. **Gere o instalador:** aba **Actions** (se pedir, clique em *I understand… enable*). Escolha **Instalador Windows** e clique em **Run workflow**. Leva de 5 a 10 minutos.
6. **Baixe e instale:** na página do repositório, abra **Releases › EcoCAD-3D-Setup-1.0.0.exe**.
   - Na primeira vez o Windows mostra "O Windows protegeu o computador", porque o programa não tem certificado pago. Clique em **Mais informações › Executar assim mesmo**.

## Atualizar o EcoCAD

- **Pelo site:** abra a pasta `docs` no GitHub, clique em **Add file › Upload files** e envie o `index.html` novo, que substitui o antigo. Depois clique em **Commit changes**.
- **Pelo Claude:** conecte o GitHub ao Claude (Configurações › Conectores › GitHub). Assim o Claude grava as atualizações direto no repositório.
- Em seguida, feche e abra o EcoCAD 3D.

## Domínio próprio (opcional)

Para usar, por exemplo, `cad.ecoteto.com.br`:

1. No GitHub, abra **Settings › Pages › Custom domain** e informe o domínio. O GitHub cria o arquivo `docs/CNAME`.
2. No painel do domínio, crie um registro **CNAME** de `cad` para `SEU-USUARIO.github.io`.
3. Rode **Instalador Windows** de novo. O instalador novo aponta para o domínio, e é preciso instalar essa versão uma vez.

## No programa instalado

- **Ctrl+S** grava direto no mesmo arquivo do projeto (`.ecocad`).
- **Ctrl+Shift+S** salva como.
- **Ctrl+O** abre um projeto.
- Dois cliques num arquivo `.ecocad` abrem o EcoCAD.
- PDF, DXF e IFC são salvos direto, sem zip.
- **F5** recarrega o programa e **F12** abre o diagnóstico.
