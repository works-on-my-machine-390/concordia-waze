import os
from conan import ConanFile
from conan.tools.cmake import CMakeToolchain, CMake, cmake_layout, CMakeDeps
from conan.tools.build import check_min_cppstd


class VenduraRecipe(ConanFile):
    name = "ConcordiaWazeGeojsonParser"
    version = "0.1"
    package_type="application"

    settings = "compiler", "build_type", "arch", "os"

    def validate(self):
        check_min_cppstd(self, "17")

    def requirements(self):
        self.requires("nlohmann_json/3.12.0")

    def build_requirements(self):
        self.tool_requires("cmake/3.31.6")

    def layout(self):
        cmake_layout(self)

    def generate(self):
        deps = CMakeDeps(self)
        deps.generate()
        tc = CMakeToolchain(self)
        tc.generate()

    def build(self):
        cmake = CMake(self)
        cmake.configure()
        cmake.build()
