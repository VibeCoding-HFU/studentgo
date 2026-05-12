MAIN=main
OUT=build
DIAGRAMS=$(wildcard diagrams/*.puml)

.PHONY: pdf clean plantuml plantuml-latex

pdf:
	latexmk -pdf -interaction=nonstopmode -halt-on-error -outdir=$(OUT) $(MAIN).tex
	cp $(OUT)/$(MAIN).pdf anforderungsspezifikation-studentgo.pdf

plantuml:
	@if command -v plantuml >/dev/null 2>&1; then \
		plantuml -tpng -o ../generated $(DIAGRAMS); \
	elif [ -n "$$PLANTUML_JAR" ]; then \
		java -Djava.awt.headless=true -jar "$$PLANTUML_JAR" -tpng -o ../generated $(DIAGRAMS); \
	else \
		echo "PlantUML nicht gefunden. Setze PLANTUML_JAR oder installiere plantuml."; \
		exit 1; \
	fi

plantuml-latex:
	mkdir -p .texmf-var
	TEXMFVAR=$$(pwd)/.texmf-var lualatex -shell-escape -interaction=nonstopmode -halt-on-error plantuml-latex-demo.tex

clean:
	latexmk -C -outdir=$(OUT) $(MAIN).tex
	rm -rf $(OUT)
