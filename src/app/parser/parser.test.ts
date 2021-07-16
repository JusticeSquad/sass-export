import { Parser } from './parser';
import { Utils } from '../utils';
import { expect } from 'chai';

describe('Parser class', () => {

  it('should return an instance of Parser', () => {
    let parser = new Parser('');
    expect(parser).to.be.instanceof(Parser);
  });

  it('should have a public parse() method', () => {
    let parser = new Parser('');
    expect(parser.parse).to.exist;
  });

  it('should return an empty array when content is empty', () => {
    let emptyParser = new Parser('');
    expect(emptyParser.parse()).that.is.an('array');
    expect(emptyParser.parse()).to.be.empty;
  });

  it('should return a array with declarations', () => {
    let rawContent = '$slate-dark: #4f6f7b;';
    let validParser = new Parser(rawContent);

    expect(validParser.parse()).that.is.an('array');
    expect(validParser.parse()).to.have.lengthOf(1);
    expect(validParser.parse()[0].name).to.be.equal('slate-dark');
    expect(validParser.parse()[0].value).to.be.equal('#4f6f7b');
  });

  it('should ignore unwell formatted declarations', () => {
    let rawContent = `$slate-dark #4f6f7b;
                      not-a-property: red`;
    let parser = new Parser(rawContent);

    expect(parser.parse()).that.is.an('array');
    expect(parser.parse()).to.be.empty;
  });

  describe('parseStructured Validations', () => {

    it('should be an empty object if content is empty', () => {
      let content = `$invalid,`;
      let parser = new Parser(content);
      let structured = parser.parseStructured();

      expect(structured).to.be.an('object');
      expect(structured).to.be.empty;
    });

    it('should be variables property', () => {
      let content = `$black: #000;
                     $white: #fff;`;
      let parser = new Parser(content);
      let structured = parser.parseStructured();

      expect(structured).to.be.an('object');
      expect(structured).to.have.property('variables');
      expect(structured.variables.length).be.equal(2);
    });

    it('should create a property if a section is present', () => {
      let content = `$black: #000;
                     $white: #fff;
                     //@sass-export-section="theme-colors"
                        $brand-gray-light: #eceff1;
                        $brand-gray-medium: #d6d6d6;
                        $brand-gray: #b0bec5;`;
      let parser = new Parser(content);
      let structured = parser.parseStructured();

      expect(structured).to.have.property('theme-colors');
      expect(structured.variables.length).be.equal(2);
      expect(structured['theme-colors'].length).be.equal(3);
      expect(structured['theme-colors'][1].name).to.be.equal('brand-gray-medium');
    });

    it('should group in variables if end-section is present', () => {
      let content = `$black: #000;
                     $white: #fff;
                     //@sass-export-section="light"
                        $brand-gray-light: #eceff1;
                     //@end-sass-export-section
                    $brand-gray-medium: #d6d6d6;
                    $brand-gray: #b0bec5;`;
      let parser = new Parser(content);
      let structured = parser.parseStructured();

      expect(structured).to.have.property('light');
      expect(structured.variables.length).be.equal(4);
      expect(structured.light.length).be.equal(1);
      expect(structured.light[0].name).be.equal('brand-gray-light');
    });

    it('should ignore the section if the name is invalid', () => {
      let content = `
                      //@sass-export-section=""
                        $brand-gray: #b0bec5;
                      //@sass-export-section
                        $brand-gray: #b0bec5;
                    `;

      let parser = new Parser(content);
      let structured = parser.parseStructured();
      expect(structured.variables.length).be.equal(2);
    });

    it('should allow JSON friendly names only for section name', () => {
      let content = `
                      //@sass-export-section="valid_-["]"
                        $brand-gray: #b0bec5;
                    `;

      let parser = new Parser(content);
      let structured = parser.parseStructured();

      expect(structured).to.have.property('valid_-[]');
    });

    it('should group variables in the same section even if they are not continue', () => {
      let content = `
                      //@sass-export-section="first"
                        $brand-gray: #b0bec5;
                        $brand-gray-2: #b0bec5;

                      //@sass-export-section="second"
                        $brand-gray: #b0bec5;

                      //@sass-export-section="first"
                        $brand-gray-3: #b0bec5;
                    `;

      let parser = new Parser(content);
      let structured = parser.parseStructured();

      expect(structured.first.length).be.equal(3);
      expect(structured.first[2].name).be.equal('brand-gray-3');
    });

    it(`should add section params to a property labeled [section-name]${Parser.PARAM_SUFFIX}`, () => {
      let content = `$black: #000;
                     $white: #fff;
                     //@sass-export-section="theme-colors"
                     //@param displayName="Theme Colors"
                     //@param description="The colors that define the theme."
                        $brand-gray-light: #eceff1;
                        $brand-gray-medium: #d6d6d6;
                        $brand-gray: #b0bec5;`;
      let parser = new Parser(content);
      let structured = parser.parseStructured();

      expect(structured).to.have.property(`theme-colors${Parser.PARAM_SUFFIX}`);
      expect(structured[`theme-colors${Parser.PARAM_SUFFIX}`]).to.have.property('displayName');
      expect(structured[`theme-colors${Parser.PARAM_SUFFIX}`].displayName).to.be.equal('Theme Colors');
      expect(structured[`theme-colors${Parser.PARAM_SUFFIX}`]).to.have.property('description');
      expect(structured[`theme-colors${Parser.PARAM_SUFFIX}`].description).to.be.equal('The colors that define the theme.');
    });

    it('should add section params to different sections where applicable', () => {
      const content = `$black: #000;
                       $white: #fff;
                       //@sass-export-section="colors"
                       //@param displayName="Theme Colors"
                       //@param description="The colors that define the theme."
                          $brand-gray-light: #eceff1;
                          $brand-gray-medium: #d6d6d6;
                          $brand-gray: #b0bec5;
                       //@end-sass-export-section
                       //@sass-export-section="typography"
                       //@param displayName="Typography"
                       //@param description="Defines the text and typography of the app."
                          $typography-size-default: 14px;
                          $typography-size-header: 24px;
                       //@end-sass-export-section
                       //@param unused="Unused Parameter."`;
      const parser = new Parser(content);
      const structured = parser.parseStructured();

      expect(structured).to.have.property(`colors${Parser.PARAM_SUFFIX}`);
      expect(structured[`colors${Parser.PARAM_SUFFIX}`]).to.have.property('displayName');
      expect(structured[`colors${Parser.PARAM_SUFFIX}`].displayName).to.be.equal('Theme Colors');
      expect(structured[`colors${Parser.PARAM_SUFFIX}`]).to.have.property('description');
      expect(structured[`colors${Parser.PARAM_SUFFIX}`].description).to.be.equal('The colors that define the theme.');
      expect(structured[`colors${Parser.PARAM_SUFFIX}`]).not.to.have.property('unused');
      expect(structured).to.have.property(`typography${Parser.PARAM_SUFFIX}`);
      expect(structured[`typography${Parser.PARAM_SUFFIX}`]).to.have.property('displayName');
      expect(structured[`typography${Parser.PARAM_SUFFIX}`].displayName).to.be.equal('Typography');
      expect(structured[`typography${Parser.PARAM_SUFFIX}`]).to.have.property('description');
      expect(structured[`typography${Parser.PARAM_SUFFIX}`].description).to.be.equal('Defines the text and typography of the app.');
      expect(structured[`typography${Parser.PARAM_SUFFIX}`]).not.to.have.property('unused');
    });

    it('should add meta-data to relevant variables', () => {
      const content = `$black: #000;
                       $white: #fff;

                       /**
                        * @meta-data displayName="Light Gray - Brand"
                        * @meta-data description="Brand color for use against dark backgrounds."
                        **/
                       $brand-gray-light: #eceff1;

                       $brand-gray-medium: #d6d6d6;

                       /**
                        * @meta-data displayName="Gray - Brand"
                        * @meta-data description="Brand color for use in default cases."
                        **/
                       $brand-gray: #b0bec5;
                       
                       /**
                        * @meta-data unused="nothing"
                        **/`;
      const parser = new Parser(content);
      const structured = parser.parseStructured();

      expect(structured).to.not.be.null;
      expect(structured).to.be.an('object');
      expect(structured).to.have.property('variables');
      expect(structured.variables.length).be.equal(5);

      expect(structured.variables[0]).to.not.have.property('metaData');
      expect(structured.variables[1]).to.not.have.property('metaData');
      expect(structured.variables[3]).to.not.have.property('metaData');

      expect(structured.variables[2]).to.have.property('metaData');
      expect(structured.variables[2].metaData).to.have.property('displayName');
      expect(structured.variables[2].metaData.displayName).to.be.equal('Light Gray - Brand');
      expect(structured.variables[2].metaData).to.have.property('description');
      expect(structured.variables[2].metaData.description).to.be.equal('Brand color for use against dark backgrounds.');

      expect(structured.variables[4]).to.have.property('metaData');
      expect(structured.variables[4].metaData).to.have.property('displayName');
      expect(structured.variables[4].metaData.displayName).to.be.equal('Gray - Brand');
      expect(structured.variables[4].metaData).to.have.property('description');
      expect(structured.variables[4].metaData.description).to.be.equal('Brand color for use in default cases.');
    });
  });

  describe('maps support', () => {
    it('should parse a map into an array', () => {
      let content = `$breakpoints: (
        small: 767px,
        medium: 992px,
        large: 1200px
      );`;

      let parser = new Parser(content);
      let structured = parser.parseStructured();

      expect(structured.variables[0].mapValue).that.is.an('array');
    });

    it('should have a structured result', () => {
      let content = `$breakpoints: (
        small: 767px,
        medium: $bp-medium,
        large: 1200px
      );`;

      let parser = new Parser(content);
      let structured = parser.parseStructured();

      expect(structured.variables[0].mapValue[0].name).be.equal('small');
      expect(structured.variables[0].mapValue[0].value).be.equal('767px');

      expect(structured.variables[0].mapValue[1].value).be.equal('$bp-medium');
    });

    it('should have a structured result for array type', () => {
      let content = `$breakpoints: (
        small: 767px,
        medium: $bp-medium,
        large: 1200px
      );`;

      let parser = new Parser(content);
      let parsedArray = parser.parse();

      expect(parsedArray[0].mapValue[0].name).be.equal('small');
      expect(parsedArray[0].mapValue[0].value).be.equal('767px');

      expect(parsedArray[0].mapValue[1].value).be.equal('$bp-medium');
    });

    it('should parse map with single quote keys', () => {
      let content = `$breakpoints: (
        'small': 767px,
        'medium': $bp-medium,
        'large': 1200px
      );`;

      let parser = new Parser(content);
      let parsedArray = parser.parse();

      expect(parsedArray[0].mapValue[0].name).be.equal('small');
      expect(parsedArray[0].mapValue[0].value).be.equal('767px');

      expect(parsedArray[0].mapValue[1].value).be.equal('$bp-medium');
    });

    it('should parse map with double quote keys', () => {
      let content = `$breakpoints: (
        "small": 767px,
        "medium": $bp-medium,
        "large": 1200px
      );`;

      let parser = new Parser(content);
      let parsedArray = parser.parse();

      expect(parsedArray[0].mapValue[0].name).be.equal('small');
      expect(parsedArray[0].mapValue[0].value).be.equal('767px');

      expect(parsedArray[0].mapValue[1].value).be.equal('$bp-medium');
    });

    it('should ignore comments inline', () => {
      let content = `
          $font-size: (
              small: 0.5rem, // 8px
              medium: 1rem, /* other comment */
              large: 1.5rem // 24px
          );
      `;

      let parser = new Parser(content);
      let structured = parser.parseStructured();

      expect(structured.variables[0].mapValue[0].name).be.equal('small');
      expect(structured.variables[0].mapValue[0].value).be.equal('0.5rem');

      expect(structured.variables[0].mapValue[1].name).be.equal('medium');
      expect(structured.variables[0].mapValue[1].value).be.equal('1rem');

      expect(structured.variables[0].mapValue[2].name).be.equal('large');
      expect(structured.variables[0].mapValue[2].value).be.equal('1.5rem');
    });

    it('should parse map-get calls', () => {
      let content = `$source: (
        one: #ff0000
      );

      $dest: (
        two: map-get($source, one)
      );`;

      let parser = new Parser(content);
      let structured = parser.parseStructured();
      let map = structured.variables[1].mapValue;

      expect(map[0].name).be.equal('two');
      expect(map[0].value).be.equal('map-get($source, one)');
    });

    it('should allow function calls with multiple arguments in values', () => {
      let content = `$funcs: (
        str-index: str-index("Helvetica Neue", "Neue"), // 11
        adjust-color: adjust-color(#d2e1dd, $red: -10, $blue: 10), // #c8e1e7
        rgba: rgba(255, 0, 0, .5), // rgba(255, 0, 0, 0.5)
        darken: darken(#b37399, 20%), // #7c4465
      );`;

      let parser = new Parser(content);
      let structured = parser.parseStructured();
      let map = structured.variables[0].mapValue;

      expect(map[0].name).be.equal('str-index');
      expect(map[0].value).be.equal('str-index("Helvetica Neue", "Neue")');

      expect(map[1].name).be.equal('adjust-color');
      expect(map[1].value).be.equal('adjust-color(#d2e1dd, $red: -10, $blue: 10)');

      expect(map[2].name).be.equal('rgba');
      expect(map[2].value).be.equal('rgba(255, 0, 0, .5)');

      expect(map[3].name).be.equal('darken');
      expect(map[3].value).be.equal('darken(#b37399, 20%)');
    });
  });

  describe('nested maps support', () => {
    it('should parse a map into an array', () => {
      let content = `$breakpoints: (
        small: 767px,
        medium: 992px,
        large: (
          lg: 1200px,
          xl: 1400px
        )
      );`;

      let parser = new Parser(content);
      let structured = parser.parseStructured();

      expect(structured.variables[0].mapValue[2].mapValue).that.is.an('array');
    });

    it('should have a structured result', () => {
      let content = `$breakpoints: (
        small: 767px,
        medium: $bp-medium,
        large: (
          lg: 1200px,
          xl: $bp-xl
        )
      );`;

      let parser = new Parser(content);
      let structured = parser.parseStructured();
      expect(structured.variables[0].mapValue[2].name).be.equal('large');

      expect(structured.variables[0].mapValue[2].mapValue[0].name).be.equal(
        'lg'
      );
      expect(structured.variables[0].mapValue[2].mapValue[0].value).be.equal(
        '1200px'
      );

      expect(structured.variables[0].mapValue[2].mapValue[1].value).be.equal(
        '$bp-xl'
      );
    });

    it('should have a structured result for array type', () => {
      let content = `$breakpoints: (
        small: 767px,
        medium: $bp-medium,
        large: (
          lg: 1200px,
          xl: $bp-xl
        )
      );`;

      let parser = new Parser(content);
      let parsedArray = parser.parse();

      expect(parsedArray[0].mapValue[2].name).be.equal('large');

      expect(parsedArray[0].mapValue[2].mapValue[0].name).be.equal('lg');
      expect(parsedArray[0].mapValue[2].mapValue[0].value).be.equal('1200px');

      expect(parsedArray[0].mapValue[2].mapValue[1].value).be.equal('$bp-xl');
    });

    it('should parse map with single quote keys', () => {
      let content = `$breakpoints: (
        'small': 767px,
        'medium': $bp-medium,
        'large': (
          'lg': 1200px,
          'xl': $bp-xl
        )
      );`;

      let parser = new Parser(content);
      let parsedArray = parser.parse();

      expect(parsedArray[0].mapValue[2].name).be.equal('large');

      expect(parsedArray[0].mapValue[2].mapValue[0].name).be.equal('lg');
      expect(parsedArray[0].mapValue[2].mapValue[0].value).be.equal('1200px');

      expect(parsedArray[0].mapValue[2].mapValue[1].value).be.equal('$bp-xl');
    });

    it('should parse map with double quote keys', () => {
      let content = `$breakpoints: (
        "small": 767px,
        "medium": $bp-medium,
        "large": (
          "lg": 1200px,
          "xl": $bp-xl
        )
      );`;

      let parser = new Parser(content);
      let parsedArray = parser.parse();

      expect(parsedArray[0].mapValue[2].name).be.equal('large');

      expect(parsedArray[0].mapValue[2].mapValue[0].name).be.equal('lg');
      expect(parsedArray[0].mapValue[2].mapValue[0].value).be.equal('1200px');

      expect(parsedArray[0].mapValue[2].mapValue[1].value).be.equal('$bp-xl');
    });
  });
});
