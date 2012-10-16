COFFEE=node_modules/.bin/coffee

SRC_FILES=$(shell ls *.coffee)

PATH=/usr/local/bin:$(shell echo $$PATH)

all: js/autopicker.js

js:
	mkdir -p js

js/autopicker.js: js $(SRC_FILES) $(COFFEE) Makefile
	@cat autopicker.coffee | $(COFFEE) -sc > $@

$(COFFEE):
	npm install coffee-script
	# PATCH: avoid a warning message from the coffee compiler
	sed -ibak -e 's/path.exists/fs.exists/' node_modules/coffee-script/lib/coffee-script/command.js
	rm -f node_modules/coffee-script/lib/coffee-script/command.js.bak

clean:
	rm -rf js
	rm -rf node_modules
