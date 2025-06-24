#!/bin/bash

# DEX Backend Test Runner
# This script runs all test suites with proper configuration

set -e

# Check for coverage flag
COVERAGE_FLAG=""
SHOW_COVERAGE_REPORT=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --coverage)
            COVERAGE_FLAG="--coverage"
            SHOW_COVERAGE_REPORT=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [--coverage] [--help]"
            echo ""
            echo "Options:"
            echo "  --coverage    Run tests with coverage report"
            echo "  --help        Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

echo "🧪 Starting DEX Backend Test Suite"
if [ "$SHOW_COVERAGE_REPORT" = true ]; then
    echo "📊 Coverage reporting enabled"
fi
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the backend directory"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    print_warning "Dependencies not found. Installing..."
    npm install
fi

# Create test results directory
mkdir -p test-results

print_status "Running TypeScript compilation check..."
if npm run cf-typegen > /dev/null 2>&1; then
    print_success "TypeScript types generated successfully"
else
    print_warning "Type generation failed, continuing with tests..."
fi

# Run different test suites
echo ""
print_status "Running Unit Tests..."
echo "========================"

# Run individual test files with specific configurations
test_files=(
    "test/index.spec.ts"
    "test/ai.spec.ts" 
    "test/database.spec.ts"
    "test/storage.spec.ts"
    "test/dex.spec.ts"
)

failed_tests=()

for test_file in "${test_files[@]}"; do
    print_status "Running $test_file..."
    if npx vitest run "$test_file" $COVERAGE_FLAG; then
        print_success "✓ $test_file passed"
    else
        print_error "✗ $test_file failed"
        failed_tests+=("$test_file")
    fi
    echo ""
done

echo ""
print_status "Running Integration Tests..."
echo "============================"

if npx vitest run test/integration.spec.ts $COVERAGE_FLAG; then
    print_success "✓ Integration tests passed"
else
    print_error "✗ Integration tests failed"
    failed_tests+=("integration")
fi

echo ""
print_status "Running Performance Tests..."
echo "============================"

if npx vitest run test/performance.spec.ts $COVERAGE_FLAG; then
    print_success "✓ Performance tests passed"
else
    print_error "✗ Performance tests failed"
    failed_tests+=("performance")
fi

echo ""
print_status "Running Security Tests..."
echo "========================="

if npx vitest run test/security.spec.ts $COVERAGE_FLAG; then
    print_success "✓ Security tests passed"
else
    print_error "✗ Security tests failed"
    failed_tests+=("security")
fi

# Summary
echo ""
echo "🏁 Test Results Summary"
echo "======================="

if [ ${#failed_tests[@]} -eq 0 ]; then
    print_success "All tests passed! 🎉"
    echo ""
    echo "✅ Unit Tests: PASSED"
    echo "✅ Integration Tests: PASSED"
    echo "✅ Performance Tests: PASSED"
    echo "✅ Security Tests: PASSED"
    echo ""
    
    if [ "$SHOW_COVERAGE_REPORT" = true ]; then
        echo "📊 Coverage Report"
        echo "=================="
        print_status "Coverage reports generated in ./coverage/"
        print_status "HTML report: ./coverage/index.html"
        print_status "LCOV report: ./coverage/lcov.info"
        echo ""
        print_status "To view HTML coverage report:"
        echo "  npm run coverage:open"
        echo ""
    fi
    
    print_status "Your DEX Backend is ready for deployment!"
    exit 0
else
    print_error "Some tests failed:"
    for failed in "${failed_tests[@]}"; do
        echo "  ❌ $failed"
    done
    echo ""
    print_warning "Please fix the failing tests before deployment."
    exit 1
fi
