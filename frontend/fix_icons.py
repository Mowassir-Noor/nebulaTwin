import os

layout_path = 'src/components/layout/MarketingLayout.tsx'
with open(layout_path, 'r') as f:
    l_content = f.read()

l_content = l_content.replace('<GithubIcon', '<Github')
l_content = l_content.replace('<TwitterIcon', '<Twitter')

with open(layout_path, 'w') as f:
    f.write(l_content)
